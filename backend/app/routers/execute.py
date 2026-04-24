"""
POST /api/execute
Runs user code against test cases via the Judge0 CE sandbox API.
Public endpoint: https://ce.judge0.com
"""
import json, base64
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import httpx

from app.mongo import questions_col
from app.security import verify_clerk_token

router = APIRouter(prefix="/api/execute", tags=["execute"])

# Judge0 Community Edition — free public instance
JUDGE0_URL = "https://ce.judge0.com/submissions?base64_encoded=true&wait=true"

# Judge0 language IDs
JUDGE0_LANG: dict[str, int] = {
    "python":     71,   # Python 3.8.1
    "javascript": 63,   # Node.js 12.14.0
    "typescript": 74,   # TypeScript 3.7.4
    "java":       62,   # OpenJDK 13.0.1
    "cpp":        54,   # GCC 9.2.0
    "go":         60,   # Go 1.13.5
}

# ── Request model ─────────────────────────────────────────────────────────────

class ExecuteRequest(BaseModel):
    question_slug: str
    language: str   # python | javascript | typescript | java | cpp | go
    code: str
    mode: str = "run"   # run | submit


# ── Python harness ────────────────────────────────────────────────────────────

_PY_LL_HELPERS = """\
def _build_ll(arr):
    if not arr:
        return None
    head = ListNode(arr[0])
    cur = head
    for x in arr[1:]:
        cur.next = ListNode(x)
        cur = cur.next
    return head

def _ll_to_arr(node):
    result = []
    while node:
        result.append(node.val)
        node = node.next
    return result
"""


def _py_normalize_expr(cmp: str) -> str:
    if cmp in ("sorted_1d", "sorted_str_list"):
        return "sorted(_v) if _v is not None else _v"
    if cmp == "sorted_2d":
        return "sorted([sorted(_x) for _x in _v]) if _v is not None else _v"
    # For n-queens the outer list contains lists of strings — sort each board by
    # joining rows, then sort boards lexicographically.
    return "_v"


def build_python_harness(
    code: str, fn_name: str, tests: list, cmp: str
) -> str:
    tests_b64 = base64.b64encode(json.dumps(tests).encode()).decode()
    norm_expr = _py_normalize_expr(cmp)
    void_inplace = cmp == "void_inplace"
    is_ll       = cmp == "linked_list"
    helpers     = _PY_LL_HELPERS if is_ll else ""

    if void_inplace:
        call_block = (
            "        _args = _copy.deepcopy(_t['a'])\n"
            f"        {fn_name}(*_args)\n"
            "        _got = _args[0]"
        )
    elif is_ll:
        call_block = (
            "        _lists = [_build_ll(_arr) for _arr in _t['a'][0]]\n"
            f"        _got_node = {fn_name}(_lists)\n"
            "        _got = _ll_to_arr(_got_node)"
        )
    else:
        call_block = f"        _got = {fn_name}(*_t['a'])"

    # For sorted_str_list where inner elements are lists (n-queens boards),
    # we need to compare by their string representations.
    if cmp == "sorted_str_list":
        compare_line = (
            "        def _board_key(b): return '|'.join(b) if isinstance(b, list) else b\n"
            "        _gnorm = sorted(_got, key=_board_key) if _got is not None else _got\n"
            "        _enorm = sorted(_exp, key=_board_key) if _exp is not None else _exp\n"
        )
    elif cmp in ("void_inplace", "linked_list", "exact"):
        compare_line = "        _gnorm = _got; _enorm = _exp\n"
    else:
        compare_line = (
            f"        _v = _got; _gnorm = {norm_expr}\n"
            f"        _v = _exp; _enorm = {norm_expr}\n"
        )

    parts = [
        # from __future__ must be first — makes list[int] work on Python 3.8
        "from __future__ import annotations\n",
        "import sys as _sys, io as _io, json as _json, copy as _copy, base64 as _b64\n",
        "_sys.stdout = _io.StringIO()\n\n",
        code, "\n\n",
        "_sys.stdout = _sys.__stdout__\n",
        helpers, "\n",
        f"_TESTS = _json.loads(_b64.b64decode('{tests_b64}').decode())\n",
        "_results = []\n",
        "for _t in _TESTS:\n",
        "    try:\n",
        call_block, "\n",
        "        _exp = _t['e']\n",
        compare_line,
        "        _passed = _json.dumps(_gnorm, sort_keys=True) == _json.dumps(_enorm, sort_keys=True)\n",
        "        _results.append({'label': _t['l'], 'passed': _passed, "
        "'got': _json.dumps(_got), 'expected': _json.dumps(_exp), "
        "'hidden': bool(_t.get('h', False))})\n",
        "    except Exception as _e:\n",
        "        _results.append({'label': _t['l'], 'passed': False, "
        "'got': 'Error: ' + str(_e), 'expected': _json.dumps(_t.get('e')), "
        "'hidden': bool(_t.get('h', False))})\n",
        "print(_json.dumps(_results))\n",
    ]
    return "".join(parts)


# ── JavaScript / TypeScript harness ──────────────────────────────────────────

_JS_LL_HELPERS = """
function _buildLL(arr) {
    if (!arr || !arr.length) return null;
    const head = new ListNode(arr[0]);
    let cur = head;
    for (let i = 1; i < arr.length; i++) {
        cur.next = new ListNode(arr[i]);
        cur = cur.next;
    }
    return head;
}
function _listToArr(node) {
    const result = [];
    while (node) { result.push(node.val); node = node.next; }
    return result;
}
"""


def build_js_harness(
    code: str, fn_name: str, tests: list, cmp: str, is_ts: bool = False
) -> str:
    tests_b64 = base64.b64encode(json.dumps(tests).encode()).decode()
    void_inplace = cmp == "void_inplace"
    is_ll       = cmp == "linked_list"
    helpers     = _JS_LL_HELPERS if is_ll else ""

    if void_inplace:
        call_block = (
            "        const _args = JSON.parse(JSON.stringify(_t.a));\n"
            f"        {fn_name}(..._args);\n"
            "        const _got = _args[0];"
        )
    elif is_ll:
        call_block = (
            "        const _inLists = _t.a[0].map(_arr => _buildLL(_arr));\n"
            f"        const _gotNode = {fn_name}(_inLists);\n"
            "        const _got = _listToArr(_gotNode);"
        )
    else:
        call_block = f"        const _got = {fn_name}(..._t.a);"

    if cmp == "sorted_1d":
        norm = "Array.isArray(v) ? [...v].sort((a,b)=>a<b?-1:a>b?1:0) : v"
    elif cmp == "sorted_2d":
        norm = (
            "Array.isArray(v) ? [...v].map(x=>[...x].sort((a,b)=>a<b?-1:a>b?1:0))"
            ".sort((a,b)=>JSON.stringify(a)<JSON.stringify(b)?-1:JSON.stringify(a)>JSON.stringify(b)?1:0) : v"
        )
    elif cmp == "sorted_str_list":
        norm = (
            "Array.isArray(v) ? [...v].sort((a,b)=>"
            "(Array.isArray(a)?a.join('|'):String(a)) < (Array.isArray(b)?b.join('|'):String(b)) ? -1 : "
            "(Array.isArray(a)?a.join('|'):String(a)) > (Array.isArray(b)?b.join('|'):String(b)) ? 1 : 0) : v"
        )
    else:
        norm = "v"

    ts_type = ": any" if is_ts else ""

    parts = [
        "const _origLog = console.log;\n",
        "console.log = () => {};\n\n",
        code, "\n\n",
        "console.log = _origLog;\n",
        helpers, "\n",
        f"const _TESTS = JSON.parse(Buffer.from('{tests_b64}', 'base64').toString('utf8'));\n",
        f"function _norm(v{ts_type}) {{ return {norm}; }}\n",
        "const _results = [];\n",
        "for (const _t of _TESTS) {\n",
        "    try {\n",
        call_block, "\n",
        "        const _exp = _t.e;\n",
        "        const _gnorm = _norm(_got);\n",
        "        const _enorm = _norm(_exp);\n",
        "        const _passed = JSON.stringify(_gnorm) === JSON.stringify(_enorm);\n",
        "        _results.push({label: _t.l, passed: _passed, "
        "got: JSON.stringify(_got), expected: JSON.stringify(_exp), hidden: !!_t.h});\n",
        "    } catch(_e) {\n",
        "        _results.push({label: _t.l, passed: false, "
        "got: 'Error: ' + String(_e), expected: JSON.stringify(_t.e), hidden: !!_t.h});\n",
        "    }\n",
        "}\n",
        "_origLog(JSON.stringify(_results));\n",
    ]
    return "".join(parts)


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("")
async def execute_code(
    req: ExecuteRequest,
    _user=Depends(verify_clerk_token),
):
    # ── 1. Fetch judge data ────────────────────────────────────────────────────
    doc = questions_col.find_one(
        {"slug": req.question_slug}, {"_id": 0, "judge": 1}
    )
    if not doc or "judge" not in doc:
        raise HTTPException(
            status_code=404,
            detail="Judge data not found — run add_judge_data.py first.",
        )

    judge = doc["judge"]
    cmp   = judge.get("cmp", "exact")

    # ── 2. Assemble test cases ─────────────────────────────────────────────────
    visible = judge.get("tests", [])
    hidden  = judge.get("hidden", [])
    tests   = visible if req.mode == "run" else visible + hidden

    # ── 3. Build harness ───────────────────────────────────────────────────────
    lang = req.language.lower()

    if lang == "python":
        harness = build_python_harness(req.code, judge["py_fn"], tests, cmp)
        parsed  = True

    elif lang in ("javascript", "typescript"):
        is_ts   = lang == "typescript"
        harness = build_js_harness(req.code, judge["js_fn"], tests, cmp, is_ts)
        parsed  = True

    else:
        # Java / C++ / Go — execute raw code; no test harness
        harness = req.code
        parsed  = False

    lang_id = JUDGE0_LANG.get(lang, JUDGE0_LANG["python"])

    # ── 4. Call Judge0 CE ─────────────────────────────────────────────────────
    harness_b64 = base64.b64encode(harness.encode()).decode()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                JUDGE0_URL,
                json={"source_code": harness_b64, "language_id": lang_id},
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Execution timed out.")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Judge0 API error: {exc.response.status_code}",
        )

    def _decode(val: str | None) -> str:
        if not val:
            return ""
        try:
            return base64.b64decode(val).decode("utf-8", errors="replace").strip()
        except Exception:
            return val

    stdout = _decode(data.get("stdout"))
    stderr = _decode(data.get("stderr"))

    # ── 5. Parse and return results ───────────────────────────────────────────
    if not parsed:
        return {
            "results": [
                {
                    "label":    "Execution",
                    "passed":   not stderr,
                    "got":      stdout or "(no output)",
                    "expected": "Test harness not available for this language",
                    "hidden":   False,
                }
            ],
            "stderr": stderr,
        }

    if not stdout:
        return {
            "results": [],
            "stderr": stderr or "No output produced — check your code for syntax errors.",
        }

    try:
        results = json.loads(stdout)
        return {"results": results, "stderr": stderr}
    except json.JSONDecodeError:
        return {
            "results": [],
            "stderr": stderr or stdout,
            "error":  "Failed to parse test output.",
        }
