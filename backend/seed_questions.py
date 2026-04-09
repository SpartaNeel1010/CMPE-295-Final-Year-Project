"""
Seed script — run from the backend/ directory:
    python seed_questions.py

Drops the existing questions collection and inserts 30 curated LeetCode-style
problems: 10 easy, 10 medium, 10 hard.

Each document schema:
{
  "slug":          str,       unique kebab-case id
  "title":         str,
  "difficulty":    "easy" | "medium" | "hard",
  "description":   str,
  "examples":      [{"input": str, "output": str, "explanation": str?}],
  "constraints":   [str],
  "notes":         str?,
  "starter_code":  {"python": str, "javascript": str, "typescript": str,
                    "java": str, "cpp": str, "go": str},
  "test_cases":    [{"label": str, "input_display": str, "expected_display": str}]
}
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.mongo import questions_col

# ── Helpers ────────────────────────────────────────────────────────────────────

def sc(py, js, ts, java, cpp, go):
    """Pack starter code for all 6 languages."""
    return {
        "python":     py,
        "javascript": js,
        "typescript": ts,
        "java":       java,
        "cpp":        cpp,
        "go":         go,
    }


# ══════════════════════════════════════════════════════════════════════════════
# EASY (10)
# ══════════════════════════════════════════════════════════════════════════════

EASY = [

# ── 1. Two Sum ────────────────────────────────────────────────────────────────
{
  "slug": "two-sum",
  "title": "Two Sum",
  "difficulty": "easy",
  "description": (
    "Given an array of integers `nums` and an integer `target`, return the "
    "indices of the two numbers such that they add up to `target`.\n\n"
    "You may assume that each input has exactly one solution, and you may not "
    "use the same element twice. You can return the answer in any order."
  ),
  "examples": [
    {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]",
     "explanation": "nums[0] + nums[1] == 9, return [0, 1]."},
    {"input": "nums = [3,2,4], target = 6",      "output": "[1,2]"},
    {"input": "nums = [3,3], target = 6",         "output": "[0,1]"},
  ],
  "constraints": [
    "2 ≤ nums.length ≤ 10⁴",
    "-10⁹ ≤ nums[i] ≤ 10⁹",
    "-10⁹ ≤ target ≤ 10⁹",
    "Only one valid answer exists.",
  ],
  "notes": "Aim for O(n) time using a hash map.",
  "starter_code": sc(
    py="""\
def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
""",
    js="""\
function twoSum(nums, target) {
    const seen = {};
    for (let i = 0; i < nums.length; i++) {
        const comp = target - nums[i];
        if (comp in seen) return [seen[comp], i];
        seen[nums[i]] = i;
    }
    return [];
}
""",
    ts="""\
function twoSum(nums: number[], target: number): number[] {
    const seen: Record<number, number> = {};
    for (let i = 0; i < nums.length; i++) {
        const comp = target - nums[i];
        if (comp in seen) return [seen[comp], i];
        seen[nums[i]] = i;
    }
    return [];
}
""",
    java="""\
import java.util.HashMap;
class Solution {
    public int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int comp = target - nums[i];
            if (seen.containsKey(comp)) return new int[]{seen.get(comp), i};
            seen.put(nums[i], i);
        }
        return new int[]{};
    }
}
""",
    cpp="""\
#include <vector>
#include <unordered_map>
using namespace std;
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int,int> seen;
        for (int i = 0; i < (int)nums.size(); i++) {
            int comp = target - nums[i];
            if (seen.count(comp)) return {seen[comp], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};
""",
    go="""\
func twoSum(nums []int, target int) []int {
    seen := make(map[int]int)
    for i, num := range nums {
        comp := target - num
        if j, ok := seen[comp]; ok {
            return []int{j, i}
        }
        seen[num] = i
    }
    return nil
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "nums=[2,7,11,15], target=9",  "expected_display": "[0,1]"},
    {"label": "Test 2", "input_display": "nums=[3,2,4], target=6",       "expected_display": "[1,2]"},
    {"label": "Test 3", "input_display": "nums=[3,3], target=6",         "expected_display": "[0,1]"},
  ],
},

# ── 2. Valid Parentheses ──────────────────────────────────────────────────────
{
  "slug": "valid-parentheses",
  "title": "Valid Parentheses",
  "difficulty": "easy",
  "description": (
    "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, "
    "`'}'`, `'['` and `']'`, determine if the input string is valid.\n\n"
    "An input string is valid if:\n"
    "- Open brackets must be closed by the same type of brackets.\n"
    "- Open brackets must be closed in the correct order.\n"
    "- Every close bracket has a corresponding open bracket of the same type."
  ),
  "examples": [
    {"input": 's = "()"',    "output": "true"},
    {"input": 's = "()[]{}"',"output": "true"},
    {"input": 's = "(]"',    "output": "false"},
  ],
  "constraints": [
    "1 ≤ s.length ≤ 10⁴",
    "s consists of parentheses only '()[]{}'.",
  ],
  "starter_code": sc(
    py="""\
def is_valid(s: str) -> bool:
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for ch in s:
        if ch in mapping:
            top = stack.pop() if stack else '#'
            if mapping[ch] != top:
                return False
        else:
            stack.append(ch)
    return not stack
""",
    js="""\
function isValid(s) {
    const stack = [];
    const map = {')':'(', '}':'{', ']':'['};
    for (const ch of s) {
        if (ch in map) {
            if (stack.pop() !== map[ch]) return false;
        } else {
            stack.push(ch);
        }
    }
    return stack.length === 0;
}
""",
    ts="""\
function isValid(s: string): boolean {
    const stack: string[] = [];
    const map: Record<string,string> = {')':'(', '}':'{', ']':'['};
    for (const ch of s) {
        if (ch in map) {
            if (stack.pop() !== map[ch]) return false;
        } else {
            stack.push(ch);
        }
    }
    return stack.length === 0;
}
""",
    java="""\
import java.util.Stack;
class Solution {
    public boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') stack.push(c);
            else {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if (c == ')' && top != '(') return false;
                if (c == '}' && top != '{') return false;
                if (c == ']' && top != '[') return false;
            }
        }
        return stack.isEmpty();
    }
}
""",
    cpp="""\
#include <string>
#include <stack>
using namespace std;
class Solution {
public:
    bool isValid(string s) {
        stack<char> st;
        for (char c : s) {
            if (c=='(' || c=='{' || c=='[') st.push(c);
            else {
                if (st.empty()) return false;
                char t = st.top(); st.pop();
                if (c==')' && t!='(') return false;
                if (c=='}' && t!='{') return false;
                if (c==']' && t!='[') return false;
            }
        }
        return st.empty();
    }
};
""",
    go="""\
func isValid(s string) bool {
    stack := []rune{}
    pairs := map[rune]rune{')': '(', '}': '{', ']': '['}
    for _, ch := range s {
        if ch == '(' || ch == '{' || ch == '[' {
            stack = append(stack, ch)
        } else {
            if len(stack) == 0 || stack[len(stack)-1] != pairs[ch] {
                return false
            }
            stack = stack[:len(stack)-1]
        }
    }
    return len(stack) == 0
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": 's = "()"',     "expected_display": "true"},
    {"label": "Test 2", "input_display": 's = "()[]{}"', "expected_display": "true"},
    {"label": "Test 3", "input_display": 's = "(]"',     "expected_display": "false"},
    {"label": "Test 4", "input_display": 's = "([)]"',   "expected_display": "false"},
  ],
},

# ── 3. Maximum Subarray ───────────────────────────────────────────────────────
{
  "slug": "maximum-subarray",
  "title": "Maximum Subarray",
  "difficulty": "easy",
  "description": (
    "Given an integer array `nums`, find the subarray with the largest sum "
    "and return its sum."
  ),
  "examples": [
    {"input": "nums = [-2,1,-3,4,-1,2,1,-5,4]", "output": "6",
     "explanation": "The subarray [4,-1,2,1] has the largest sum 6."},
    {"input": "nums = [1]",                       "output": "1"},
    {"input": "nums = [5,4,-1,7,8]",              "output": "23"},
  ],
  "constraints": [
    "1 ≤ nums.length ≤ 10⁵",
    "-10⁴ ≤ nums[i] ≤ 10⁴",
  ],
  "notes": "Kadane's algorithm solves this in O(n) time and O(1) space.",
  "starter_code": sc(
    py="""\
def max_sub_array(nums: list[int]) -> int:
    max_sum = cur = nums[0]
    for num in nums[1:]:
        cur = max(num, cur + num)
        max_sum = max(max_sum, cur)
    return max_sum
""",
    js="""\
function maxSubArray(nums) {
    let maxSum = nums[0], cur = nums[0];
    for (let i = 1; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);
        maxSum = Math.max(maxSum, cur);
    }
    return maxSum;
}
""",
    ts="""\
function maxSubArray(nums: number[]): number {
    let maxSum = nums[0], cur = nums[0];
    for (let i = 1; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);
        maxSum = Math.max(maxSum, cur);
    }
    return maxSum;
}
""",
    java="""\
class Solution {
    public int maxSubArray(int[] nums) {
        int maxSum = nums[0], cur = nums[0];
        for (int i = 1; i < nums.length; i++) {
            cur = Math.max(nums[i], cur + nums[i]);
            maxSum = Math.max(maxSum, cur);
        }
        return maxSum;
    }
}
""",
    cpp="""\
#include <vector>
#include <algorithm>
using namespace std;
class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int maxSum = nums[0], cur = nums[0];
        for (int i = 1; i < (int)nums.size(); i++) {
            cur = max(nums[i], cur + nums[i]);
            maxSum = max(maxSum, cur);
        }
        return maxSum;
    }
};
""",
    go="""\
func maxSubArray(nums []int) int {
    maxSum, cur := nums[0], nums[0]
    for _, n := range nums[1:] {
        if cur+n > n { cur = cur + n } else { cur = n }
        if cur > maxSum { maxSum = cur }
    }
    return maxSum
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "nums=[-2,1,-3,4,-1,2,1,-5,4]", "expected_display": "6"},
    {"label": "Test 2", "input_display": "nums=[1]",                      "expected_display": "1"},
    {"label": "Test 3", "input_display": "nums=[5,4,-1,7,8]",             "expected_display": "23"},
  ],
},

# ── 4. Climbing Stairs ────────────────────────────────────────────────────────
{
  "slug": "climbing-stairs",
  "title": "Climbing Stairs",
  "difficulty": "easy",
  "description": (
    "You are climbing a staircase. It takes `n` steps to reach the top.\n\n"
    "Each time you can either climb 1 or 2 steps. In how many distinct ways "
    "can you climb to the top?"
  ),
  "examples": [
    {"input": "n = 2", "output": "2",
     "explanation": "There are two ways: (1+1) and (2)."},
    {"input": "n = 3", "output": "3",
     "explanation": "There are three ways: (1+1+1), (1+2), (2+1)."},
  ],
  "constraints": ["1 ≤ n ≤ 45"],
  "notes": "The answer is the (n+1)th Fibonacci number.",
  "starter_code": sc(
    py="""\
def climb_stairs(n: int) -> int:
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b
""",
    js="""\
function climbStairs(n) {
    if (n <= 2) return n;
    let [a, b] = [1, 2];
    for (let i = 3; i <= n; i++) [a, b] = [b, a + b];
    return b;
}
""",
    ts="""\
function climbStairs(n: number): number {
    if (n <= 2) return n;
    let [a, b] = [1, 2];
    for (let i = 3; i <= n; i++) [a, b] = [b, a + b];
    return b;
}
""",
    java="""\
class Solution {
    public int climbStairs(int n) {
        if (n <= 2) return n;
        int a = 1, b = 2;
        for (int i = 3; i <= n; i++) {
            int c = a + b; a = b; b = c;
        }
        return b;
    }
}
""",
    cpp="""\
class Solution {
public:
    int climbStairs(int n) {
        if (n <= 2) return n;
        int a = 1, b = 2;
        for (int i = 3; i <= n; i++) {
            int c = a + b; a = b; b = c;
        }
        return b;
    }
};
""",
    go="""\
func climbStairs(n int) int {
    if n <= 2 { return n }
    a, b := 1, 2
    for i := 3; i <= n; i++ { a, b = b, a+b }
    return b
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "n = 2",  "expected_display": "2"},
    {"label": "Test 2", "input_display": "n = 3",  "expected_display": "3"},
    {"label": "Test 3", "input_display": "n = 10", "expected_display": "89"},
  ],
},

# ── 5. Best Time to Buy and Sell Stock ────────────────────────────────────────
{
  "slug": "best-time-to-buy-sell-stock",
  "title": "Best Time to Buy and Sell Stock",
  "difficulty": "easy",
  "description": (
    "You are given an array `prices` where `prices[i]` is the price of a "
    "given stock on the i-th day.\n\n"
    "You want to maximize your profit by choosing a single day to buy one "
    "stock and choosing a different day in the future to sell that stock.\n\n"
    "Return the maximum profit you can achieve from this transaction. If you "
    "cannot achieve any profit, return `0`."
  ),
  "examples": [
    {"input": "prices = [7,1,5,3,6,4]", "output": "5",
     "explanation": "Buy on day 2 (price=1) and sell on day 5 (price=6), profit = 5."},
    {"input": "prices = [7,6,4,3,1]",   "output": "0",
     "explanation": "No transaction achieves profit; return 0."},
  ],
  "constraints": [
    "1 ≤ prices.length ≤ 10⁵",
    "0 ≤ prices[i] ≤ 10⁴",
  ],
  "starter_code": sc(
    py="""\
def max_profit(prices: list[int]) -> int:
    min_price = float('inf')
    max_profit = 0
    for price in prices:
        min_price = min(min_price, price)
        max_profit = max(max_profit, price - min_price)
    return max_profit
""",
    js="""\
function maxProfit(prices) {
    let minPrice = Infinity, maxP = 0;
    for (const p of prices) {
        minPrice = Math.min(minPrice, p);
        maxP = Math.max(maxP, p - minPrice);
    }
    return maxP;
}
""",
    ts="""\
function maxProfit(prices: number[]): number {
    let minPrice = Infinity, maxP = 0;
    for (const p of prices) {
        minPrice = Math.min(minPrice, p);
        maxP = Math.max(maxP, p - minPrice);
    }
    return maxP;
}
""",
    java="""\
class Solution {
    public int maxProfit(int[] prices) {
        int minPrice = Integer.MAX_VALUE, maxP = 0;
        for (int p : prices) {
            minPrice = Math.min(minPrice, p);
            maxP = Math.max(maxP, p - minPrice);
        }
        return maxP;
    }
}
""",
    cpp="""\
#include <vector>
#include <algorithm>
#include <climits>
using namespace std;
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int minP = INT_MAX, maxP = 0;
        for (int p : prices) {
            minP = min(minP, p);
            maxP = max(maxP, p - minP);
        }
        return maxP;
    }
};
""",
    go="""\
func maxProfit(prices []int) int {
    minP, maxP := 1<<31-1, 0
    for _, p := range prices {
        if p < minP { minP = p }
        if p - minP > maxP { maxP = p - minP }
    }
    return maxP
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "prices=[7,1,5,3,6,4]", "expected_display": "5"},
    {"label": "Test 2", "input_display": "prices=[7,6,4,3,1]",   "expected_display": "0"},
    {"label": "Test 3", "input_display": "prices=[1,2]",          "expected_display": "1"},
  ],
},

# ── 6. Contains Duplicate ─────────────────────────────────────────────────────
{
  "slug": "contains-duplicate",
  "title": "Contains Duplicate",
  "difficulty": "easy",
  "description": (
    "Given an integer array `nums`, return `true` if any value appears at "
    "least twice in the array, and return `false` if every element is distinct."
  ),
  "examples": [
    {"input": "nums = [1,2,3,1]",   "output": "true"},
    {"input": "nums = [1,2,3,4]",   "output": "false"},
    {"input": "nums = [1,1,1,3,3,4,3,2,4,2]", "output": "true"},
  ],
  "constraints": [
    "1 ≤ nums.length ≤ 10⁵",
    "-10⁹ ≤ nums[i] ≤ 10⁹",
  ],
  "starter_code": sc(
    py="""\
def contains_duplicate(nums: list[int]) -> bool:
    return len(nums) != len(set(nums))
""",
    js="""\
function containsDuplicate(nums) {
    return new Set(nums).size !== nums.length;
}
""",
    ts="""\
function containsDuplicate(nums: number[]): boolean {
    return new Set(nums).size !== nums.length;
}
""",
    java="""\
import java.util.HashSet;
class Solution {
    public boolean containsDuplicate(int[] nums) {
        HashSet<Integer> seen = new HashSet<>();
        for (int n : nums) if (!seen.add(n)) return true;
        return false;
    }
}
""",
    cpp="""\
#include <vector>
#include <unordered_set>
using namespace std;
class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        unordered_set<int> seen;
        for (int n : nums) if (!seen.insert(n).second) return true;
        return false;
    }
};
""",
    go="""\
func containsDuplicate(nums []int) bool {
    seen := make(map[int]bool)
    for _, n := range nums {
        if seen[n] { return true }
        seen[n] = true
    }
    return false
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "nums=[1,2,3,1]",  "expected_display": "true"},
    {"label": "Test 2", "input_display": "nums=[1,2,3,4]",  "expected_display": "false"},
    {"label": "Test 3", "input_display": "nums=[1,1,1,3,3]","expected_display": "true"},
  ],
},

# ── 7. Palindrome Number ──────────────────────────────────────────────────────
{
  "slug": "palindrome-number",
  "title": "Palindrome Number",
  "difficulty": "easy",
  "description": (
    "Given an integer `x`, return `true` if `x` is a palindrome, and `false` "
    "otherwise.\n\nAn integer is a palindrome when it reads the same forward "
    "and backward."
  ),
  "examples": [
    {"input": "x = 121",  "output": "true",
     "explanation": "121 reads as 121 from left to right and right to left."},
    {"input": "x = -121", "output": "false",
     "explanation": "From left to right, it reads -121. From right to left, 121-. Not a palindrome."},
    {"input": "x = 10",   "output": "false"},
  ],
  "constraints": ["-2³¹ ≤ x ≤ 2³¹ - 1"],
  "notes": "Try solving without converting the integer to a string.",
  "starter_code": sc(
    py="""\
def is_palindrome(x: int) -> bool:
    if x < 0 or (x % 10 == 0 and x != 0):
        return False
    rev = 0
    while x > rev:
        rev = rev * 10 + x % 10
        x //= 10
    return x == rev or x == rev // 10
""",
    js="""\
function isPalindrome(x) {
    if (x < 0 || (x % 10 === 0 && x !== 0)) return false;
    let rev = 0;
    while (x > rev) {
        rev = rev * 10 + x % 10;
        x = Math.trunc(x / 10);
    }
    return x === rev || x === Math.trunc(rev / 10);
}
""",
    ts="""\
function isPalindrome(x: number): boolean {
    if (x < 0 || (x % 10 === 0 && x !== 0)) return false;
    let rev = 0;
    while (x > rev) {
        rev = rev * 10 + x % 10;
        x = Math.trunc(x / 10);
    }
    return x === rev || x === Math.trunc(rev / 10);
}
""",
    java="""\
class Solution {
    public boolean isPalindrome(int x) {
        if (x < 0 || (x % 10 == 0 && x != 0)) return false;
        int rev = 0;
        while (x > rev) {
            rev = rev * 10 + x % 10;
            x /= 10;
        }
        return x == rev || x == rev / 10;
    }
}
""",
    cpp="""\
class Solution {
public:
    bool isPalindrome(int x) {
        if (x < 0 || (x % 10 == 0 && x != 0)) return false;
        int rev = 0;
        while (x > rev) {
            rev = rev * 10 + x % 10;
            x /= 10;
        }
        return x == rev || x == rev / 10;
    }
};
""",
    go="""\
func isPalindrome(x int) bool {
    if x < 0 || (x%10 == 0 && x != 0) { return false }
    rev := 0
    for x > rev {
        rev = rev*10 + x%10
        x /= 10
    }
    return x == rev || x == rev/10
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "x = 121",  "expected_display": "true"},
    {"label": "Test 2", "input_display": "x = -121", "expected_display": "false"},
    {"label": "Test 3", "input_display": "x = 10",   "expected_display": "false"},
    {"label": "Test 4", "input_display": "x = 0",    "expected_display": "true"},
  ],
},

# ── 8. Reverse String ─────────────────────────────────────────────────────────
{
  "slug": "reverse-string",
  "title": "Reverse String",
  "difficulty": "easy",
  "description": (
    "Write a function that reverses a string. The input is given as an array "
    "of characters `s`.\n\n"
    "You must do this by modifying the input array in-place with O(1) extra memory."
  ),
  "examples": [
    {"input": 's = ["h","e","l","l","o"]', "output": '["o","l","l","e","h"]'},
    {"input": 's = ["H","a","n","n","a","h"]', "output": '["h","a","n","n","a","H"]'},
  ],
  "constraints": [
    "1 ≤ s.length ≤ 10⁵",
    "s[i] is a printable ASCII character.",
  ],
  "starter_code": sc(
    py="""\
def reverse_string(s: list[str]) -> None:
    left, right = 0, len(s) - 1
    while left < right:
        s[left], s[right] = s[right], s[left]
        left += 1
        right -= 1
""",
    js="""\
function reverseString(s) {
    let l = 0, r = s.length - 1;
    while (l < r) {
        [s[l], s[r]] = [s[r], s[l]];
        l++; r--;
    }
}
""",
    ts="""\
function reverseString(s: string[]): void {
    let l = 0, r = s.length - 1;
    while (l < r) {
        [s[l], s[r]] = [s[r], s[l]];
        l++; r--;
    }
}
""",
    java="""\
class Solution {
    public void reverseString(char[] s) {
        int l = 0, r = s.length - 1;
        while (l < r) {
            char tmp = s[l]; s[l] = s[r]; s[r] = tmp;
            l++; r--;
        }
    }
}
""",
    cpp="""\
#include <vector>
#include <algorithm>
using namespace std;
class Solution {
public:
    void reverseString(vector<char>& s) {
        int l = 0, r = s.size() - 1;
        while (l < r) swap(s[l++], s[r--]);
    }
};
""",
    go="""\
func reverseString(s []byte) {
    for l, r := 0, len(s)-1; l < r; l, r = l+1, r-1 {
        s[l], s[r] = s[r], s[l]
    }
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": 's=["h","e","l","l","o"]',         "expected_display": '["o","l","l","e","h"]'},
    {"label": "Test 2", "input_display": 's=["H","a","n","n","a","h"]',     "expected_display": '["h","a","n","n","a","H"]'},
  ],
},

# ── 9. Binary Search ──────────────────────────────────────────────────────────
{
  "slug": "binary-search",
  "title": "Binary Search",
  "difficulty": "easy",
  "description": (
    "Given an array of integers `nums` which is sorted in ascending order, "
    "and an integer `target`, write a function to search `target` in `nums`. "
    "If `target` exists, return its index. Otherwise, return `-1`.\n\n"
    "You must write an algorithm with O(log n) runtime complexity."
  ),
  "examples": [
    {"input": "nums = [-1,0,3,5,9,12], target = 9", "output": "4",
     "explanation": "9 exists in nums and its index is 4."},
    {"input": "nums = [-1,0,3,5,9,12], target = 2", "output": "-1",
     "explanation": "2 does not exist in nums so return -1."},
  ],
  "constraints": [
    "1 ≤ nums.length ≤ 10⁴",
    "-10⁴ < nums[i], target < 10⁴",
    "All the integers in nums are unique.",
    "nums is sorted in ascending order.",
  ],
  "starter_code": sc(
    py="""\
def search(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
""",
    js="""\
function search(nums, target) {
    let lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
""",
    ts="""\
function search(nums: number[], target: number): number {
    let lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
""",
    java="""\
class Solution {
    public int search(int[] nums, int target) {
        int lo = 0, hi = nums.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }
}
""",
    cpp="""\
#include <vector>
using namespace std;
class Solution {
public:
    int search(vector<int>& nums, int target) {
        int lo = 0, hi = nums.size() - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }
};
""",
    go="""\
func search(nums []int, target int) int {
    lo, hi := 0, len(nums)-1
    for lo <= hi {
        mid := lo + (hi-lo)/2
        if nums[mid] == target { return mid }
        if nums[mid] < target { lo = mid + 1 } else { hi = mid - 1 }
    }
    return -1
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "nums=[-1,0,3,5,9,12], target=9", "expected_display": "4"},
    {"label": "Test 2", "input_display": "nums=[-1,0,3,5,9,12], target=2", "expected_display": "-1"},
    {"label": "Test 3", "input_display": "nums=[5], target=5",              "expected_display": "0"},
  ],
},

# ── 10. Majority Element ──────────────────────────────────────────────────────
{
  "slug": "majority-element",
  "title": "Majority Element",
  "difficulty": "easy",
  "description": (
    "Given an array `nums` of size `n`, return the majority element.\n\n"
    "The majority element is the element that appears more than `⌊n / 2⌋` "
    "times. You may assume that the majority element always exists in the array."
  ),
  "examples": [
    {"input": "nums = [3,2,3]",       "output": "3"},
    {"input": "nums = [2,2,1,1,1,2,2]","output": "2"},
  ],
  "constraints": [
    "n == nums.length",
    "1 ≤ n ≤ 5 × 10⁴",
    "-10⁹ ≤ nums[i] ≤ 10⁹",
    "The majority element always exists.",
  ],
  "notes": "Boyer-Moore Voting Algorithm solves this in O(n) time and O(1) space.",
  "starter_code": sc(
    py="""\
def majority_element(nums: list[int]) -> int:
    count, candidate = 0, None
    for num in nums:
        if count == 0:
            candidate = num
        count += 1 if num == candidate else -1
    return candidate
""",
    js="""\
function majorityElement(nums) {
    let count = 0, candidate = null;
    for (const num of nums) {
        if (count === 0) candidate = num;
        count += num === candidate ? 1 : -1;
    }
    return candidate;
}
""",
    ts="""\
function majorityElement(nums: number[]): number {
    let count = 0, candidate = 0;
    for (const num of nums) {
        if (count === 0) candidate = num;
        count += num === candidate ? 1 : -1;
    }
    return candidate;
}
""",
    java="""\
class Solution {
    public int majorityElement(int[] nums) {
        int count = 0, candidate = 0;
        for (int num : nums) {
            if (count == 0) candidate = num;
            count += num == candidate ? 1 : -1;
        }
        return candidate;
    }
}
""",
    cpp="""\
#include <vector>
using namespace std;
class Solution {
public:
    int majorityElement(vector<int>& nums) {
        int count = 0, candidate = 0;
        for (int num : nums) {
            if (count == 0) candidate = num;
            count += num == candidate ? 1 : -1;
        }
        return candidate;
    }
};
""",
    go="""\
func majorityElement(nums []int) int {
    count, candidate := 0, 0
    for _, num := range nums {
        if count == 0 { candidate = num }
        if num == candidate { count++ } else { count-- }
    }
    return candidate
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "nums=[3,2,3]",         "expected_display": "3"},
    {"label": "Test 2", "input_display": "nums=[2,2,1,1,1,2,2]", "expected_display": "2"},
    {"label": "Test 3", "input_display": "nums=[1]",              "expected_display": "1"},
  ],
},

]  # end EASY


# ══════════════════════════════════════════════════════════════════════════════
# MEDIUM (10)
# ══════════════════════════════════════════════════════════════════════════════

MEDIUM = [

# ── 1. Longest Substring Without Repeating Characters ─────────────────────────
{
  "slug": "longest-substring-without-repeating-characters",
  "title": "Longest Substring Without Repeating Characters",
  "difficulty": "medium",
  "description": (
    "Given a string `s`, find the length of the longest substring without "
    "repeating characters."
  ),
  "examples": [
    {"input": 's = "abcabcbb"', "output": "3",
     "explanation": 'The answer is "abc", with length 3.'},
    {"input": 's = "bbbbb"',    "output": "1",
     "explanation": 'The answer is "b", with length 1.'},
    {"input": 's = "pwwkew"',   "output": "3",
     "explanation": 'The answer is "wke", with length 3.'},
  ],
  "constraints": [
    "0 ≤ s.length ≤ 5 × 10⁴",
    "s consists of English letters, digits, symbols and spaces.",
  ],
  "notes": "Sliding window + hash set gives O(n) time.",
  "starter_code": sc(
    py="""\
def length_of_longest_substring(s: str) -> int:
    char_set = set()
    left = max_len = 0
    for right, ch in enumerate(s):
        while ch in char_set:
            char_set.remove(s[left])
            left += 1
        char_set.add(ch)
        max_len = max(max_len, right - left + 1)
    return max_len
""",
    js="""\
function lengthOfLongestSubstring(s) {
    const seen = new Map();
    let left = 0, maxLen = 0;
    for (let r = 0; r < s.length; r++) {
        if (seen.has(s[r]) && seen.get(s[r]) >= left) left = seen.get(s[r]) + 1;
        seen.set(s[r], r);
        maxLen = Math.max(maxLen, r - left + 1);
    }
    return maxLen;
}
""",
    ts="""\
function lengthOfLongestSubstring(s: string): number {
    const seen = new Map<string, number>();
    let left = 0, maxLen = 0;
    for (let r = 0; r < s.length; r++) {
        const prev = seen.get(s[r]);
        if (prev !== undefined && prev >= left) left = prev + 1;
        seen.set(s[r], r);
        maxLen = Math.max(maxLen, r - left + 1);
    }
    return maxLen;
}
""",
    java="""\
import java.util.HashMap;
class Solution {
    public int lengthOfLongestSubstring(String s) {
        HashMap<Character, Integer> seen = new HashMap<>();
        int left = 0, maxLen = 0;
        for (int r = 0; r < s.length(); r++) {
            char c = s.charAt(r);
            if (seen.containsKey(c) && seen.get(c) >= left) left = seen.get(c) + 1;
            seen.put(c, r);
            maxLen = Math.max(maxLen, r - left + 1);
        }
        return maxLen;
    }
}
""",
    cpp="""\
#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        unordered_map<char,int> seen;
        int left = 0, maxLen = 0;
        for (int r = 0; r < (int)s.size(); r++) {
            if (seen.count(s[r]) && seen[s[r]] >= left) left = seen[s[r]] + 1;
            seen[s[r]] = r;
            maxLen = max(maxLen, r - left + 1);
        }
        return maxLen;
    }
};
""",
    go="""\
func lengthOfLongestSubstring(s string) int {
    seen := make(map[byte]int)
    left, maxLen := 0, 0
    for r := 0; r < len(s); r++ {
        if idx, ok := seen[s[r]]; ok && idx >= left {
            left = idx + 1
        }
        seen[s[r]] = r
        if r-left+1 > maxLen { maxLen = r - left + 1 }
    }
    return maxLen
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": 's="abcabcbb"', "expected_display": "3"},
    {"label": "Test 2", "input_display": 's="bbbbb"',    "expected_display": "1"},
    {"label": "Test 3", "input_display": 's="pwwkew"',   "expected_display": "3"},
    {"label": "Test 4", "input_display": 's=""',         "expected_display": "0"},
  ],
},

# ── 2. 3Sum ───────────────────────────────────────────────────────────────────
{
  "slug": "3sum",
  "title": "3Sum",
  "difficulty": "medium",
  "description": (
    "Given an integer array `nums`, return all the triplets "
    "`[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, `j != k`, "
    "and `nums[i] + nums[j] + nums[k] == 0`.\n\n"
    "Notice that the solution set must not contain duplicate triplets."
  ),
  "examples": [
    {"input": "nums = [-1,0,1,2,-1,-4]", "output": "[[-1,-1,2],[-1,0,1]]"},
    {"input": "nums = [0,1,1]",           "output": "[]"},
    {"input": "nums = [0,0,0]",           "output": "[[0,0,0]]"},
  ],
  "constraints": [
    "3 ≤ nums.length ≤ 3000",
    "-10⁵ ≤ nums[i] ≤ 10⁵",
  ],
  "starter_code": sc(
    py="""\
def three_sum(nums: list[int]) -> list[list[int]]:
    nums.sort()
    result = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total == 0:
                result.append([nums[i], nums[left], nums[right]])
                while left < right and nums[left] == nums[left + 1]: left += 1
                while left < right and nums[right] == nums[right - 1]: right -= 1
                left += 1; right -= 1
            elif total < 0:
                left += 1
            else:
                right -= 1
    return result
""",
    js="""\
function threeSum(nums) {
    nums.sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] === nums[i-1]) continue;
        let l = i + 1, r = nums.length - 1;
        while (l < r) {
            const sum = nums[i] + nums[l] + nums[r];
            if (sum === 0) {
                result.push([nums[i], nums[l], nums[r]]);
                while (l < r && nums[l] === nums[l+1]) l++;
                while (l < r && nums[r] === nums[r-1]) r--;
                l++; r--;
            } else if (sum < 0) l++;
            else r--;
        }
    }
    return result;
}
""",
    ts="""\
function threeSum(nums: number[]): number[][] {
    nums.sort((a, b) => a - b);
    const result: number[][] = [];
    for (let i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] === nums[i-1]) continue;
        let l = i + 1, r = nums.length - 1;
        while (l < r) {
            const sum = nums[i] + nums[l] + nums[r];
            if (sum === 0) {
                result.push([nums[i], nums[l], nums[r]]);
                while (l < r && nums[l] === nums[l+1]) l++;
                while (l < r && nums[r] === nums[r-1]) r--;
                l++; r--;
            } else if (sum < 0) l++;
            else r--;
        }
    }
    return result;
}
""",
    java="""\
import java.util.*;
class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> result = new ArrayList<>();
        for (int i = 0; i < nums.length - 2; i++) {
            if (i > 0 && nums[i] == nums[i-1]) continue;
            int l = i + 1, r = nums.length - 1;
            while (l < r) {
                int sum = nums[i] + nums[l] + nums[r];
                if (sum == 0) {
                    result.add(Arrays.asList(nums[i], nums[l], nums[r]));
                    while (l < r && nums[l] == nums[l+1]) l++;
                    while (l < r && nums[r] == nums[r-1]) r--;
                    l++; r--;
                } else if (sum < 0) l++;
                else r--;
            }
        }
        return result;
    }
}
""",
    cpp="""\
#include <vector>
#include <algorithm>
using namespace std;
class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        vector<vector<int>> result;
        for (int i = 0; i < (int)nums.size() - 2; i++) {
            if (i > 0 && nums[i] == nums[i-1]) continue;
            int l = i+1, r = nums.size()-1;
            while (l < r) {
                int sum = nums[i] + nums[l] + nums[r];
                if (sum == 0) {
                    result.push_back({nums[i], nums[l], nums[r]});
                    while (l<r && nums[l]==nums[l+1]) l++;
                    while (l<r && nums[r]==nums[r-1]) r--;
                    l++; r--;
                } else if (sum < 0) l++;
                else r--;
            }
        }
        return result;
    }
};
""",
    go="""\
import "sort"
func threeSum(nums []int) [][]int {
    sort.Ints(nums)
    var result [][]int
    for i := 0; i < len(nums)-2; i++ {
        if i > 0 && nums[i] == nums[i-1] { continue }
        l, r := i+1, len(nums)-1
        for l < r {
            sum := nums[i] + nums[l] + nums[r]
            if sum == 0 {
                result = append(result, []int{nums[i], nums[l], nums[r]})
                for l < r && nums[l] == nums[l+1] { l++ }
                for l < r && nums[r] == nums[r-1] { r-- }
                l++; r--
            } else if sum < 0 { l++ } else { r-- }
        }
    }
    return result
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "nums=[-1,0,1,2,-1,-4]", "expected_display": "[[-1,-1,2],[-1,0,1]]"},
    {"label": "Test 2", "input_display": "nums=[0,1,1]",           "expected_display": "[]"},
    {"label": "Test 3", "input_display": "nums=[0,0,0]",           "expected_display": "[[0,0,0]]"},
  ],
},

# ── 3. Product of Array Except Self ──────────────────────────────────────────
{
  "slug": "product-of-array-except-self",
  "title": "Product of Array Except Self",
  "difficulty": "medium",
  "description": (
    "Given an integer array `nums`, return an array `answer` such that "
    "`answer[i]` is equal to the product of all the elements of `nums` except "
    "`nums[i]`.\n\n"
    "The product of any prefix or suffix of `nums` is guaranteed to fit in a "
    "32-bit integer.\n\n"
    "You must write an algorithm that runs in O(n) time and without using the "
    "division operation."
  ),
  "examples": [
    {"input": "nums = [1,2,3,4]", "output": "[24,12,8,6]"},
    {"input": "nums = [-1,1,0,-3,3]", "output": "[0,0,9,0,0]"},
  ],
  "constraints": [
    "2 ≤ nums.length ≤ 10⁵",
    "-30 ≤ nums[i] ≤ 30",
    "The product of any prefix or suffix fits in a 32-bit integer.",
  ],
  "notes": "O(1) extra space (excluding output array) using prefix and suffix passes.",
  "starter_code": sc(
    py="""\
def product_except_self(nums: list[int]) -> list[int]:
    n = len(nums)
    result = [1] * n
    prefix = 1
    for i in range(n):
        result[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(n - 1, -1, -1):
        result[i] *= suffix
        suffix *= nums[i]
    return result
""",
    js="""\
function productExceptSelf(nums) {
    const n = nums.length, result = new Array(n).fill(1);
    let prefix = 1;
    for (let i = 0; i < n; i++) { result[i] = prefix; prefix *= nums[i]; }
    let suffix = 1;
    for (let i = n-1; i >= 0; i--) { result[i] *= suffix; suffix *= nums[i]; }
    return result;
}
""",
    ts="""\
function productExceptSelf(nums: number[]): number[] {
    const n = nums.length, result = new Array(n).fill(1);
    let prefix = 1;
    for (let i = 0; i < n; i++) { result[i] = prefix; prefix *= nums[i]; }
    let suffix = 1;
    for (let i = n-1; i >= 0; i--) { result[i] *= suffix; suffix *= nums[i]; }
    return result;
}
""",
    java="""\
class Solution {
    public int[] productExceptSelf(int[] nums) {
        int n = nums.length;
        int[] result = new int[n];
        result[0] = 1;
        for (int i = 1; i < n; i++) result[i] = result[i-1] * nums[i-1];
        int suffix = 1;
        for (int i = n-1; i >= 0; i--) { result[i] *= suffix; suffix *= nums[i]; }
        return result;
    }
}
""",
    cpp="""\
#include <vector>
using namespace std;
class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        int n = nums.size();
        vector<int> result(n, 1);
        int prefix = 1;
        for (int i = 0; i < n; i++) { result[i] = prefix; prefix *= nums[i]; }
        int suffix = 1;
        for (int i = n-1; i >= 0; i--) { result[i] *= suffix; suffix *= nums[i]; }
        return result;
    }
};
""",
    go="""\
func productExceptSelf(nums []int) []int {
    n := len(nums)
    result := make([]int, n)
    prefix := 1
    for i := 0; i < n; i++ { result[i] = prefix; prefix *= nums[i] }
    suffix := 1
    for i := n-1; i >= 0; i-- { result[i] *= suffix; suffix *= nums[i] }
    return result
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "nums=[1,2,3,4]",       "expected_display": "[24,12,8,6]"},
    {"label": "Test 2", "input_display": "nums=[-1,1,0,-3,3]",   "expected_display": "[0,0,9,0,0]"},
  ],
},

# ── 4. Group Anagrams ─────────────────────────────────────────────────────────
{
  "slug": "group-anagrams",
  "title": "Group Anagrams",
  "difficulty": "medium",
  "description": (
    "Given an array of strings `strs`, group the anagrams together. You can "
    "return the answer in any order.\n\n"
    "An Anagram is a word or phrase formed by rearranging the letters of a "
    "different word or phrase, typically using all the original letters exactly once."
  ),
  "examples": [
    {"input": 'strs = ["eat","tea","tan","ate","nat","bat"]',
     "output": '[["bat"],["nat","tan"],["ate","eat","tea"]]'},
    {"input": 'strs = [""]', "output": '[[""]]'},
    {"input": 'strs = ["a"]', "output": '[["a"]]'},
  ],
  "constraints": [
    "1 ≤ strs.length ≤ 10⁴",
    "0 ≤ strs[i].length ≤ 100",
    "strs[i] consists of lowercase English letters.",
  ],
  "starter_code": sc(
    py="""\
from collections import defaultdict
def group_anagrams(strs: list[str]) -> list[list[str]]:
    groups = defaultdict(list)
    for s in strs:
        key = tuple(sorted(s))
        groups[key].append(s)
    return list(groups.values())
""",
    js="""\
function groupAnagrams(strs) {
    const map = new Map();
    for (const s of strs) {
        const key = s.split('').sort().join('');
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(s);
    }
    return [...map.values()];
}
""",
    ts="""\
function groupAnagrams(strs: string[]): string[][] {
    const map = new Map<string, string[]>();
    for (const s of strs) {
        const key = s.split('').sort().join('');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
    }
    return [...map.values()];
}
""",
    java="""\
import java.util.*;
class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> map = new HashMap<>();
        for (String s : strs) {
            char[] arr = s.toCharArray();
            Arrays.sort(arr);
            String key = new String(arr);
            map.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }
        return new ArrayList<>(map.values());
    }
}
""",
    cpp="""\
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;
class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        unordered_map<string, vector<string>> map;
        for (auto& s : strs) {
            string key = s;
            sort(key.begin(), key.end());
            map[key].push_back(s);
        }
        vector<vector<string>> result;
        for (auto& [k, v] : map) result.push_back(v);
        return result;
    }
};
""",
    go="""\
import "sort"
func groupAnagrams(strs []string) [][]string {
    groups := make(map[string][]string)
    for _, s := range strs {
        r := []rune(s)
        sort.Slice(r, func(i, j int) bool { return r[i] < r[j] })
        key := string(r)
        groups[key] = append(groups[key], s)
    }
    result := make([][]string, 0, len(groups))
    for _, v := range groups { result = append(result, v) }
    return result
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": 'strs=["eat","tea","tan","ate","nat","bat"]',
     "expected_display": '[["bat"],["nat","tan"],["ate","eat","tea"]]'},
    {"label": "Test 2", "input_display": 'strs=[""]',  "expected_display": '[[""]]'},
    {"label": "Test 3", "input_display": 'strs=["a"]', "expected_display": '[["a"]]'},
  ],
},

# ── 5. Coin Change ────────────────────────────────────────────────────────────
{
  "slug": "coin-change",
  "title": "Coin Change",
  "difficulty": "medium",
  "description": (
    "You are given an integer array `coins` representing coins of different "
    "denominations and an integer `amount` representing a total amount of money.\n\n"
    "Return the fewest number of coins that you need to make up that amount. "
    "If that amount of money cannot be made up by any combination of the coins, "
    "return `-1`.\n\nYou may assume that you have an infinite number of each kind of coin."
  ),
  "examples": [
    {"input": "coins = [1,5,10,25], amount = 36", "output": "3",
     "explanation": "25 + 10 + 1 = 36, using 3 coins."},
    {"input": "coins = [2], amount = 3",           "output": "-1"},
    {"input": "coins = [1], amount = 0",            "output": "0"},
  ],
  "constraints": [
    "1 ≤ coins.length ≤ 12",
    "1 ≤ coins[i] ≤ 2³¹ - 1",
    "0 ≤ amount ≤ 10⁴",
  ],
  "starter_code": sc(
    py="""\
def coin_change(coins: list[int], amount: int) -> int:
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for i in range(coin, amount + 1):
            dp[i] = min(dp[i], dp[i - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1
""",
    js="""\
function coinChange(coins, amount) {
    const dp = new Array(amount + 1).fill(Infinity);
    dp[0] = 0;
    for (const coin of coins)
        for (let i = coin; i <= amount; i++)
            dp[i] = Math.min(dp[i], dp[i - coin] + 1);
    return dp[amount] === Infinity ? -1 : dp[amount];
}
""",
    ts="""\
function coinChange(coins: number[], amount: number): number {
    const dp = new Array(amount + 1).fill(Infinity);
    dp[0] = 0;
    for (const coin of coins)
        for (let i = coin; i <= amount; i++)
            dp[i] = Math.min(dp[i], dp[i - coin] + 1);
    return dp[amount] === Infinity ? -1 : dp[amount];
}
""",
    java="""\
import java.util.Arrays;
class Solution {
    public int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        for (int coin : coins)
            for (int i = coin; i <= amount; i++)
                dp[i] = Math.min(dp[i], dp[i - coin] + 1);
        return dp[amount] > amount ? -1 : dp[amount];
    }
}
""",
    cpp="""\
#include <vector>
#include <algorithm>
#include <climits>
using namespace std;
class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        vector<int> dp(amount + 1, INT_MAX);
        dp[0] = 0;
        for (int coin : coins)
            for (int i = coin; i <= amount; i++)
                if (dp[i-coin] != INT_MAX)
                    dp[i] = min(dp[i], dp[i-coin] + 1);
        return dp[amount] == INT_MAX ? -1 : dp[amount];
    }
};
""",
    go="""\
func coinChange(coins []int, amount int) int {
    dp := make([]int, amount+1)
    for i := 1; i <= amount; i++ { dp[i] = amount + 1 }
    for _, coin := range coins {
        for i := coin; i <= amount; i++ {
            if dp[i-coin]+1 < dp[i] { dp[i] = dp[i-coin] + 1 }
        }
    }
    if dp[amount] > amount { return -1 }
    return dp[amount]
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "coins=[1,5,10,25], amount=36", "expected_display": "3"},
    {"label": "Test 2", "input_display": "coins=[2], amount=3",           "expected_display": "-1"},
    {"label": "Test 3", "input_display": "coins=[1], amount=0",           "expected_display": "0"},
  ],
},

# ── 6. Number of Islands ──────────────────────────────────────────────────────
{
  "slug": "number-of-islands",
  "title": "Number of Islands",
  "difficulty": "medium",
  "description": (
    "Given an `m × n` 2D binary grid which represents a map of `'1'`s (land) "
    "and `'0'`s (water), return the number of islands.\n\n"
    "An island is surrounded by water and is formed by connecting adjacent "
    "lands horizontally or vertically. You may assume all four edges of the "
    "grid are all surrounded by water."
  ),
  "examples": [
    {"input": 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
     "output": "1"},
    {"input": 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
     "output": "3"},
  ],
  "constraints": [
    "m == grid.length",
    "n == grid[i].length",
    "1 ≤ m, n ≤ 300",
    "grid[i][j] is '0' or '1'.",
  ],
  "starter_code": sc(
    py="""\
def num_islands(grid: list[list[str]]) -> int:
    count = 0
    def dfs(r, c):
        if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]) or grid[r][c] != '1':
            return
        grid[r][c] = '0'
        dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1)
    for r in range(len(grid)):
        for c in range(len(grid[0])):
            if grid[r][c] == '1':
                dfs(r, c)
                count += 1
    return count
""",
    js="""\
function numIslands(grid) {
    let count = 0;
    const dfs = (r, c) => {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] !== '1') return;
        grid[r][c] = '0';
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => dfs(r+dr, c+dc));
    };
    for (let r = 0; r < grid.length; r++)
        for (let c = 0; c < grid[0].length; c++)
            if (grid[r][c] === '1') { dfs(r, c); count++; }
    return count;
}
""",
    ts="""\
function numIslands(grid: string[][]): number {
    let count = 0;
    const dfs = (r: number, c: number) => {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] !== '1') return;
        grid[r][c] = '0';
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => dfs(r+dr, c+dc));
    };
    for (let r = 0; r < grid.length; r++)
        for (let c = 0; c < grid[0].length; c++)
            if (grid[r][c] === '1') { dfs(r, c); count++; }
    return count;
}
""",
    java="""\
class Solution {
    private void dfs(char[][] grid, int r, int c) {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] != '1') return;
        grid[r][c] = '0';
        dfs(grid, r+1, c); dfs(grid, r-1, c); dfs(grid, r, c+1); dfs(grid, r, c-1);
    }
    public int numIslands(char[][] grid) {
        int count = 0;
        for (int r = 0; r < grid.length; r++)
            for (int c = 0; c < grid[0].length; c++)
                if (grid[r][c] == '1') { dfs(grid, r, c); count++; }
        return count;
    }
}
""",
    cpp="""\
#include <vector>
using namespace std;
class Solution {
    void dfs(vector<vector<char>>& g, int r, int c) {
        if (r<0||r>=(int)g.size()||c<0||c>=(int)g[0].size()||g[r][c]!='1') return;
        g[r][c]='0';
        dfs(g,r+1,c); dfs(g,r-1,c); dfs(g,r,c+1); dfs(g,r,c-1);
    }
public:
    int numIslands(vector<vector<char>>& grid) {
        int count = 0;
        for (int r=0;r<(int)grid.size();r++)
            for (int c=0;c<(int)grid[0].size();c++)
                if (grid[r][c]=='1') { dfs(grid,r,c); count++; }
        return count;
    }
};
""",
    go="""\
func numIslands(grid [][]byte) int {
    var dfs func(r, c int)
    dfs = func(r, c int) {
        if r < 0 || r >= len(grid) || c < 0 || c >= len(grid[0]) || grid[r][c] != '1' { return }
        grid[r][c] = '0'
        dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1)
    }
    count := 0
    for r := range grid {
        for c := range grid[r] {
            if grid[r][c] == '1' { dfs(r, c); count++ }
        }
    }
    return count
}
""",
  ),
  "test_cases": [
    {"label": "Test 1",
     "input_display": 'grid=[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
     "expected_display": "1"},
    {"label": "Test 2",
     "input_display": 'grid=[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
     "expected_display": "3"},
  ],
},

# ── 7. Jump Game ──────────────────────────────────────────────────────────────
{
  "slug": "jump-game",
  "title": "Jump Game",
  "difficulty": "medium",
  "description": (
    "You are given an integer array `nums`. You are initially positioned at "
    "the first index of the array.\n\n"
    "Each element in the array represents your maximum jump length at that position.\n\n"
    "Return `true` if you can reach the last index, or `false` otherwise."
  ),
  "examples": [
    {"input": "nums = [2,3,1,1,4]", "output": "true",
     "explanation": "Jump 1 step from index 0 to 1, then 3 steps to the last index."},
    {"input": "nums = [3,2,1,0,4]", "output": "false",
     "explanation": "You will always arrive at index 3, but its maximum jump is 0."},
  ],
  "constraints": [
    "1 ≤ nums.length ≤ 10⁴",
    "0 ≤ nums[i] ≤ 10⁵",
  ],
  "starter_code": sc(
    py="""\
def can_jump(nums: list[int]) -> bool:
    max_reach = 0
    for i, jump in enumerate(nums):
        if i > max_reach:
            return False
        max_reach = max(max_reach, i + jump)
    return True
""",
    js="""\
function canJump(nums) {
    let maxReach = 0;
    for (let i = 0; i < nums.length; i++) {
        if (i > maxReach) return false;
        maxReach = Math.max(maxReach, i + nums[i]);
    }
    return true;
}
""",
    ts="""\
function canJump(nums: number[]): boolean {
    let maxReach = 0;
    for (let i = 0; i < nums.length; i++) {
        if (i > maxReach) return false;
        maxReach = Math.max(maxReach, i + nums[i]);
    }
    return true;
}
""",
    java="""\
class Solution {
    public boolean canJump(int[] nums) {
        int maxReach = 0;
        for (int i = 0; i < nums.length; i++) {
            if (i > maxReach) return false;
            maxReach = Math.max(maxReach, i + nums[i]);
        }
        return true;
    }
}
""",
    cpp="""\
#include <vector>
#include <algorithm>
using namespace std;
class Solution {
public:
    bool canJump(vector<int>& nums) {
        int maxReach = 0;
        for (int i = 0; i < (int)nums.size(); i++) {
            if (i > maxReach) return false;
            maxReach = max(maxReach, i + nums[i]);
        }
        return true;
    }
};
""",
    go="""\
func canJump(nums []int) bool {
    maxReach := 0
    for i, v := range nums {
        if i > maxReach { return false }
        if i+v > maxReach { maxReach = i + v }
    }
    return true
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "nums=[2,3,1,1,4]", "expected_display": "true"},
    {"label": "Test 2", "input_display": "nums=[3,2,1,0,4]", "expected_display": "false"},
    {"label": "Test 3", "input_display": "nums=[0]",         "expected_display": "true"},
  ],
},

# ── 8. Container With Most Water ──────────────────────────────────────────────
{
  "slug": "container-with-most-water",
  "title": "Container With Most Water",
  "difficulty": "medium",
  "description": (
    "You are given an integer array `height` of length `n`. There are `n` "
    "vertical lines drawn such that the two endpoints of the i-th line are "
    "`(i, 0)` and `(i, height[i])`.\n\n"
    "Find two lines that together with the x-axis form a container, such that "
    "the container contains the most water.\n\nReturn the maximum amount of water."
  ),
  "examples": [
    {"input": "height = [1,8,6,2,5,4,8,3,7]", "output": "49",
     "explanation": "Lines at index 1 (h=8) and index 8 (h=7), area = min(8,7)*7 = 49."},
    {"input": "height = [1,1]", "output": "1"},
  ],
  "constraints": [
    "n == height.length",
    "2 ≤ n ≤ 10⁵",
    "0 ≤ height[i] ≤ 10⁴",
  ],
  "starter_code": sc(
    py="""\
def max_area(height: list[int]) -> int:
    left, right = 0, len(height) - 1
    max_water = 0
    while left < right:
        water = min(height[left], height[right]) * (right - left)
        max_water = max(max_water, water)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return max_water
""",
    js="""\
function maxArea(height) {
    let l = 0, r = height.length - 1, max = 0;
    while (l < r) {
        max = Math.max(max, Math.min(height[l], height[r]) * (r - l));
        if (height[l] < height[r]) l++; else r--;
    }
    return max;
}
""",
    ts="""\
function maxArea(height: number[]): number {
    let l = 0, r = height.length - 1, max = 0;
    while (l < r) {
        max = Math.max(max, Math.min(height[l], height[r]) * (r - l));
        if (height[l] < height[r]) l++; else r--;
    }
    return max;
}
""",
    java="""\
class Solution {
    public int maxArea(int[] height) {
        int l = 0, r = height.length - 1, max = 0;
        while (l < r) {
            max = Math.max(max, Math.min(height[l], height[r]) * (r - l));
            if (height[l] < height[r]) l++; else r--;
        }
        return max;
    }
}
""",
    cpp="""\
#include <vector>
#include <algorithm>
using namespace std;
class Solution {
public:
    int maxArea(vector<int>& height) {
        int l = 0, r = height.size()-1, maxW = 0;
        while (l < r) {
            maxW = max(maxW, min(height[l],height[r]) * (r-l));
            if (height[l] < height[r]) l++; else r--;
        }
        return maxW;
    }
};
""",
    go="""\
func maxArea(height []int) int {
    l, r, maxW := 0, len(height)-1, 0
    for l < r {
        h := height[l]; if height[r] < h { h = height[r] }
        if w := h * (r - l); w > maxW { maxW = w }
        if height[l] < height[r] { l++ } else { r-- }
    }
    return maxW
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "height=[1,8,6,2,5,4,8,3,7]", "expected_display": "49"},
    {"label": "Test 2", "input_display": "height=[1,1]",                "expected_display": "1"},
    {"label": "Test 3", "input_display": "height=[4,3,2,1,4]",          "expected_display": "16"},
  ],
},

# ── 9. Rotate Image ───────────────────────────────────────────────────────────
{
  "slug": "rotate-image",
  "title": "Rotate Image",
  "difficulty": "medium",
  "description": (
    "You are given an `n × n` 2D `matrix` representing an image, rotate the "
    "image by 90 degrees (clockwise).\n\n"
    "You have to rotate the image in-place, which means you have to modify the "
    "input 2D matrix directly. DO NOT allocate another 2D matrix and do the rotation."
  ),
  "examples": [
    {"input": "matrix = [[1,2,3],[4,5,6],[7,8,9]]",
     "output": "[[7,4,1],[8,5,2],[9,6,3]]"},
    {"input": "matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]",
     "output": "[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]"},
  ],
  "constraints": [
    "n == matrix.length == matrix[i].length",
    "1 ≤ n ≤ 20",
    "-1000 ≤ matrix[i][j] ≤ 1000",
  ],
  "notes": "Transpose then reverse each row (or reverse rows then transpose).",
  "starter_code": sc(
    py="""\
def rotate(matrix: list[list[int]]) -> None:
    n = len(matrix)
    # Transpose
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    # Reverse each row
    for row in matrix:
        row.reverse()
""",
    js="""\
function rotate(matrix) {
    const n = matrix.length;
    for (let i = 0; i < n; i++)
        for (let j = i+1; j < n; j++)
            [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
    for (const row of matrix) row.reverse();
}
""",
    ts="""\
function rotate(matrix: number[][]): void {
    const n = matrix.length;
    for (let i = 0; i < n; i++)
        for (let j = i+1; j < n; j++)
            [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
    for (const row of matrix) row.reverse();
}
""",
    java="""\
class Solution {
    public void rotate(int[][] matrix) {
        int n = matrix.length;
        for (int i = 0; i < n; i++)
            for (int j = i+1; j < n; j++) {
                int tmp = matrix[i][j];
                matrix[i][j] = matrix[j][i];
                matrix[j][i] = tmp;
            }
        for (int[] row : matrix) {
            int l = 0, r = row.length - 1;
            while (l < r) { int tmp = row[l]; row[l++] = row[r]; row[r--] = tmp; }
        }
    }
}
""",
    cpp="""\
#include <vector>
#include <algorithm>
using namespace std;
class Solution {
public:
    void rotate(vector<vector<int>>& matrix) {
        int n = matrix.size();
        for (int i = 0; i < n; i++)
            for (int j = i+1; j < n; j++) swap(matrix[i][j], matrix[j][i]);
        for (auto& row : matrix) reverse(row.begin(), row.end());
    }
};
""",
    go="""\
func rotate(matrix [][]int) {
    n := len(matrix)
    for i := 0; i < n; i++ {
        for j := i+1; j < n; j++ {
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
        }
    }
    for _, row := range matrix {
        for l, r := 0, len(row)-1; l < r; l, r = l+1, r-1 {
            row[l], row[r] = row[r], row[l]
        }
    }
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "matrix=[[1,2,3],[4,5,6],[7,8,9]]",
     "expected_display": "[[7,4,1],[8,5,2],[9,6,3]]"},
    {"label": "Test 2",
     "input_display": "matrix=[[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]",
     "expected_display": "[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]"},
  ],
},

# ── 10. Word Search ───────────────────────────────────────────────────────────
{
  "slug": "word-search",
  "title": "Word Search",
  "difficulty": "medium",
  "description": (
    "Given an `m × n` grid of characters `board` and a string `word`, return "
    "`true` if `word` exists in the grid.\n\n"
    "The word can be constructed from letters of sequentially adjacent cells, "
    "where adjacent cells are horizontally or vertically neighboring. The same "
    "letter cell may not be used more than once."
  ),
  "examples": [
    {"input": 'board=[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word="ABCCED"',
     "output": "true"},
    {"input": 'board=[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word="SEE"',
     "output": "true"},
    {"input": 'board=[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word="ABCB"',
     "output": "false"},
  ],
  "constraints": [
    "m == board.length",
    "n == board[i].length",
    "1 ≤ m, n ≤ 6",
    "1 ≤ word.length ≤ 15",
    "board and word consist of only lowercase and uppercase English letters.",
  ],
  "starter_code": sc(
    py="""\
def exist(board: list[list[str]], word: str) -> bool:
    rows, cols = len(board), len(board[0])
    def dfs(r, c, idx):
        if idx == len(word): return True
        if r < 0 or r >= rows or c < 0 or c >= cols or board[r][c] != word[idx]:
            return False
        tmp, board[r][c] = board[r][c], '#'
        found = any(dfs(r+dr, c+dc, idx+1) for dr,dc in [(1,0),(-1,0),(0,1),(0,-1)])
        board[r][c] = tmp
        return found
    return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))
""",
    js="""\
function exist(board, word) {
    const [m, n] = [board.length, board[0].length];
    const dfs = (r, c, i) => {
        if (i === word.length) return true;
        if (r<0||r>=m||c<0||c>=n||board[r][c]!==word[i]) return false;
        const tmp = board[r][c]; board[r][c] = '#';
        const found = [[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc]) => dfs(r+dr,c+dc,i+1));
        board[r][c] = tmp;
        return found;
    };
    for (let r=0;r<m;r++) for (let c=0;c<n;c++) if (dfs(r,c,0)) return true;
    return false;
}
""",
    ts="""\
function exist(board: string[][], word: string): boolean {
    const [m, n] = [board.length, board[0].length];
    const dfs = (r: number, c: number, i: number): boolean => {
        if (i === word.length) return true;
        if (r<0||r>=m||c<0||c>=n||board[r][c]!==word[i]) return false;
        const tmp = board[r][c]; board[r][c] = '#';
        const found = [[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc]) => dfs(r+dr,c+dc,i+1));
        board[r][c] = tmp;
        return found;
    };
    for (let r=0;r<m;r++) for (let c=0;c<n;c++) if (dfs(r,c,0)) return true;
    return false;
}
""",
    java="""\
class Solution {
    private char[][] board; private String word;
    private boolean dfs(int r, int c, int i) {
        if (i == word.length()) return true;
        if (r<0||r>=board.length||c<0||c>=board[0].length||board[r][c]!=word.charAt(i)) return false;
        char tmp = board[r][c]; board[r][c] = '#';
        boolean found = dfs(r+1,c,i+1)||dfs(r-1,c,i+1)||dfs(r,c+1,i+1)||dfs(r,c-1,i+1);
        board[r][c] = tmp;
        return found;
    }
    public boolean exist(char[][] board, String word) {
        this.board = board; this.word = word;
        for (int r=0;r<board.length;r++)
            for (int c=0;c<board[0].length;c++)
                if (dfs(r,c,0)) return true;
        return false;
    }
}
""",
    cpp="""\
#include <vector>
#include <string>
using namespace std;
class Solution {
    bool dfs(vector<vector<char>>& b, const string& w, int r, int c, int i) {
        if (i==(int)w.size()) return true;
        if (r<0||r>=(int)b.size()||c<0||c>=(int)b[0].size()||b[r][c]!=w[i]) return false;
        char tmp=b[r][c]; b[r][c]='#';
        bool found=dfs(b,w,r+1,c,i+1)||dfs(b,w,r-1,c,i+1)||dfs(b,w,r,c+1,i+1)||dfs(b,w,r,c-1,i+1);
        b[r][c]=tmp; return found;
    }
public:
    bool exist(vector<vector<char>>& board, string word) {
        for (int r=0;r<(int)board.size();r++)
            for (int c=0;c<(int)board[0].size();c++)
                if (dfs(board,word,r,c,0)) return true;
        return false;
    }
};
""",
    go="""\
func exist(board [][]byte, word string) bool {
    m, n := len(board), len(board[0])
    var dfs func(r, c, i int) bool
    dfs = func(r, c, i int) bool {
        if i == len(word) { return true }
        if r<0||r>=m||c<0||c>=n||board[r][c]!=word[i] { return false }
        tmp := board[r][c]; board[r][c] = '#'
        found := dfs(r+1,c,i+1)||dfs(r-1,c,i+1)||dfs(r,c+1,i+1)||dfs(r,c-1,i+1)
        board[r][c] = tmp
        return found
    }
    for r := range board { for c := range board[r] { if dfs(r,c,0) { return true } } }
    return false
}
""",
  ),
  "test_cases": [
    {"label": "Test 1",
     "input_display": 'board=[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word="ABCCED"',
     "expected_display": "true"},
    {"label": "Test 2",
     "input_display": 'board=[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word="SEE"',
     "expected_display": "true"},
    {"label": "Test 3",
     "input_display": 'board=[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word="ABCB"',
     "expected_display": "false"},
  ],
},

]  # end MEDIUM


# ══════════════════════════════════════════════════════════════════════════════
# HARD (10)
# ══════════════════════════════════════════════════════════════════════════════

HARD = [

# ── 1. Median of Two Sorted Arrays ───────────────────────────────────────────
{
  "slug": "median-of-two-sorted-arrays",
  "title": "Median of Two Sorted Arrays",
  "difficulty": "hard",
  "description": (
    "Given two sorted arrays `nums1` and `nums2` of sizes `m` and `n` "
    "respectively, return the median of the two sorted arrays.\n\n"
    "The overall run time complexity should be O(log(m + n))."
  ),
  "examples": [
    {"input": "nums1 = [1,3], nums2 = [2]",       "output": "2.00000",
     "explanation": "Merged: [1,2,3]. Median = 2."},
    {"input": "nums1 = [1,2], nums2 = [3,4]",      "output": "2.50000",
     "explanation": "Merged: [1,2,3,4]. Median = (2+3)/2 = 2.5."},
  ],
  "constraints": [
    "nums1.length == m",
    "nums2.length == n",
    "0 ≤ m, n ≤ 1000",
    "0 ≤ m + n ≤ 2000",
    "-10⁶ ≤ nums1[i], nums2[i] ≤ 10⁶",
  ],
  "notes": "Binary search on the smaller array. Partition such that the left half has the correct number of elements.",
  "starter_code": sc(
    py="""\
def find_median_sorted_arrays(nums1: list[int], nums2: list[int]) -> float:
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1
    m, n = len(nums1), len(nums2)
    lo, hi = 0, m
    while lo <= hi:
        cut1 = (lo + hi) // 2
        cut2 = (m + n + 1) // 2 - cut1
        l1 = nums1[cut1-1] if cut1 > 0 else float('-inf')
        r1 = nums1[cut1]   if cut1 < m else float('inf')
        l2 = nums2[cut2-1] if cut2 > 0 else float('-inf')
        r2 = nums2[cut2]   if cut2 < n else float('inf')
        if l1 <= r2 and l2 <= r1:
            if (m + n) % 2:
                return float(max(l1, l2))
            return (max(l1, l2) + min(r1, r2)) / 2.0
        elif l1 > r2:
            hi = cut1 - 1
        else:
            lo = cut1 + 1
    return 0.0
""",
    js="""\
function findMedianSortedArrays(nums1, nums2) {
    if (nums1.length > nums2.length) [nums1, nums2] = [nums2, nums1];
    const m = nums1.length, n = nums2.length;
    let lo = 0, hi = m;
    while (lo <= hi) {
        const c1 = (lo + hi) >> 1, c2 = ((m+n+1)>>1) - c1;
        const l1 = c1>0 ? nums1[c1-1] : -Infinity, r1 = c1<m ? nums1[c1] : Infinity;
        const l2 = c2>0 ? nums2[c2-1] : -Infinity, r2 = c2<n ? nums2[c2] : Infinity;
        if (l1<=r2 && l2<=r1) {
            if ((m+n)%2) return Math.max(l1,l2);
            return (Math.max(l1,l2)+Math.min(r1,r2))/2;
        } else if (l1>r2) hi=c1-1; else lo=c1+1;
    }
    return 0;
}
""",
    ts="""\
function findMedianSortedArrays(nums1: number[], nums2: number[]): number {
    if (nums1.length > nums2.length) [nums1, nums2] = [nums2, nums1];
    const m = nums1.length, n = nums2.length;
    let lo = 0, hi = m;
    while (lo <= hi) {
        const c1 = (lo + hi) >> 1, c2 = ((m+n+1)>>1) - c1;
        const l1 = c1>0 ? nums1[c1-1] : -Infinity, r1 = c1<m ? nums1[c1] : Infinity;
        const l2 = c2>0 ? nums2[c2-1] : -Infinity, r2 = c2<n ? nums2[c2] : Infinity;
        if (l1<=r2 && l2<=r1) {
            if ((m+n)%2) return Math.max(l1,l2);
            return (Math.max(l1,l2)+Math.min(r1,r2))/2;
        } else if (l1>r2) hi=c1-1; else lo=c1+1;
    }
    return 0;
}
""",
    java="""\
class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        if (nums1.length > nums2.length) { int[] t=nums1; nums1=nums2; nums2=t; }
        int m=nums1.length, n=nums2.length, lo=0, hi=m;
        while (lo<=hi) {
            int c1=(lo+hi)/2, c2=(m+n+1)/2-c1;
            int l1=c1>0?nums1[c1-1]:Integer.MIN_VALUE;
            int r1=c1<m?nums1[c1]:Integer.MAX_VALUE;
            int l2=c2>0?nums2[c2-1]:Integer.MIN_VALUE;
            int r2=c2<n?nums2[c2]:Integer.MAX_VALUE;
            if (l1<=r2&&l2<=r1) {
                if ((m+n)%2==1) return Math.max(l1,l2);
                return (Math.max(l1,l2)+(double)Math.min(r1,r2))/2;
            } else if (l1>r2) hi=c1-1; else lo=c1+1;
        }
        return 0;
    }
}
""",
    cpp="""\
#include <vector>
#include <algorithm>
#include <climits>
using namespace std;
class Solution {
public:
    double findMedianSortedArrays(vector<int>& a, vector<int>& b) {
        if (a.size()>b.size()) swap(a,b);
        int m=a.size(),n=b.size(),lo=0,hi=m;
        while(lo<=hi){
            int c1=(lo+hi)/2,c2=(m+n+1)/2-c1;
            int l1=c1?a[c1-1]:INT_MIN, r1=c1<m?a[c1]:INT_MAX;
            int l2=c2?b[c2-1]:INT_MIN, r2=c2<n?b[c2]:INT_MAX;
            if(l1<=r2&&l2<=r1){
                if((m+n)%2) return max(l1,l2);
                return (max(l1,l2)+(double)min(r1,r2))/2;
            } else if(l1>r2) hi=c1-1; else lo=c1+1;
        }
        return 0;
    }
};
""",
    go="""\
import "math"
func findMedianSortedArrays(nums1 []int, nums2 []int) float64 {
    if len(nums1) > len(nums2) { nums1, nums2 = nums2, nums1 }
    m, n := len(nums1), len(nums2)
    lo, hi := 0, m
    for lo <= hi {
        c1 := (lo+hi)/2; c2 := (m+n+1)/2 - c1
        l1, r1 := math.MinInt64, math.MaxInt64
        l2, r2 := math.MinInt64, math.MaxInt64
        if c1 > 0 { l1 = nums1[c1-1] }; if c1 < m { r1 = nums1[c1] }
        if c2 > 0 { l2 = nums2[c2-1] }; if c2 < n { r2 = nums2[c2] }
        if l1 <= r2 && l2 <= r1 {
            maxL := l1; if l2 > l1 { maxL = l2 }
            minR := r1; if r2 < r1 { minR = r2 }
            if (m+n)%2 == 1 { return float64(maxL) }
            return float64(maxL+minR) / 2.0
        } else if l1 > r2 { hi = c1-1 } else { lo = c1+1 }
    }
    return 0
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "nums1=[1,3], nums2=[2]",     "expected_display": "2.00000"},
    {"label": "Test 2", "input_display": "nums1=[1,2], nums2=[3,4]",   "expected_display": "2.50000"},
    {"label": "Test 3", "input_display": "nums1=[], nums2=[1]",        "expected_display": "1.00000"},
  ],
},

# ── 2. Trapping Rain Water ────────────────────────────────────────────────────
{
  "slug": "trapping-rain-water",
  "title": "Trapping Rain Water",
  "difficulty": "hard",
  "description": (
    "Given `n` non-negative integers representing an elevation map where the "
    "width of each bar is 1, compute how much water it can trap after raining."
  ),
  "examples": [
    {"input": "height = [0,1,0,2,1,0,1,3,2,1,2,1]", "output": "6",
     "explanation": "The above elevation map traps 6 units of rain water."},
    {"input": "height = [4,2,0,3,2,5]",              "output": "9"},
  ],
  "constraints": [
    "n == height.length",
    "1 ≤ n ≤ 2 × 10⁴",
    "0 ≤ height[i] ≤ 10⁵",
  ],
  "notes": "Two-pointer approach achieves O(n) time and O(1) space.",
  "starter_code": sc(
    py="""\
def trap(height: list[int]) -> int:
    left, right = 0, len(height) - 1
    left_max = right_max = water = 0
    while left < right:
        if height[left] < height[right]:
            if height[left] >= left_max:
                left_max = height[left]
            else:
                water += left_max - height[left]
            left += 1
        else:
            if height[right] >= right_max:
                right_max = height[right]
            else:
                water += right_max - height[right]
            right -= 1
    return water
""",
    js="""\
function trap(height) {
    let l=0, r=height.length-1, lMax=0, rMax=0, water=0;
    while (l < r) {
        if (height[l] < height[r]) {
            lMax = Math.max(lMax, height[l]);
            water += lMax - height[l++];
        } else {
            rMax = Math.max(rMax, height[r]);
            water += rMax - height[r--];
        }
    }
    return water;
}
""",
    ts="""\
function trap(height: number[]): number {
    let l=0, r=height.length-1, lMax=0, rMax=0, water=0;
    while (l < r) {
        if (height[l] < height[r]) {
            lMax = Math.max(lMax, height[l]);
            water += lMax - height[l++];
        } else {
            rMax = Math.max(rMax, height[r]);
            water += rMax - height[r--];
        }
    }
    return water;
}
""",
    java="""\
class Solution {
    public int trap(int[] height) {
        int l=0, r=height.length-1, lMax=0, rMax=0, water=0;
        while (l < r) {
            if (height[l] < height[r]) {
                lMax = Math.max(lMax, height[l]);
                water += lMax - height[l++];
            } else {
                rMax = Math.max(rMax, height[r]);
                water += rMax - height[r--];
            }
        }
        return water;
    }
}
""",
    cpp="""\
#include <vector>
#include <algorithm>
using namespace std;
class Solution {
public:
    int trap(vector<int>& height) {
        int l=0, r=height.size()-1, lMax=0, rMax=0, water=0;
        while (l < r) {
            if (height[l] < height[r]) {
                lMax = max(lMax, height[l]);
                water += lMax - height[l++];
            } else {
                rMax = max(rMax, height[r]);
                water += rMax - height[r--];
            }
        }
        return water;
    }
};
""",
    go="""\
func trap(height []int) int {
    l, r, lMax, rMax, water := 0, len(height)-1, 0, 0, 0
    for l < r {
        if height[l] < height[r] {
            if height[l] > lMax { lMax = height[l] }
            water += lMax - height[l]; l++
        } else {
            if height[r] > rMax { rMax = height[r] }
            water += rMax - height[r]; r--
        }
    }
    return water
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "height=[0,1,0,2,1,0,1,3,2,1,2,1]", "expected_display": "6"},
    {"label": "Test 2", "input_display": "height=[4,2,0,3,2,5]",              "expected_display": "9"},
    {"label": "Test 3", "input_display": "height=[3,0,2,0,4]",               "expected_display": "7"},
  ],
},

# ── 3. Minimum Window Substring ───────────────────────────────────────────────
{
  "slug": "minimum-window-substring",
  "title": "Minimum Window Substring",
  "difficulty": "hard",
  "description": (
    "Given two strings `s` and `t` of lengths `m` and `n` respectively, return "
    "the minimum window substring of `s` such that every character in `t` "
    "(including duplicates) is included in the window. If there is no such "
    "substring, return the empty string `\"\"`."
  ),
  "examples": [
    {"input": 's="ADOBECODEBANC", t="ABC"', "output": '"BANC"',
     "explanation": "The minimum window substring BANC includes A, B, and C."},
    {"input": 's="a", t="a"',               "output": '"a"'},
    {"input": 's="a", t="aa"',              "output": '""',
     "explanation": "Both 'a's are needed but only one is available."},
  ],
  "constraints": [
    "m == s.length",
    "n == t.length",
    "1 ≤ m, n ≤ 10⁵",
    "s and t consist of uppercase and lowercase English letters.",
  ],
  "starter_code": sc(
    py="""\
from collections import Counter
def min_window(s: str, t: str) -> str:
    need = Counter(t)
    missing = len(t)
    best = ""
    left = 0
    for right, ch in enumerate(s):
        if need[ch] > 0:
            missing -= 1
        need[ch] -= 1
        if missing == 0:
            while need[s[left]] < 0:
                need[s[left]] += 1
                left += 1
            window = s[left:right+1]
            if not best or len(window) < len(best):
                best = window
            need[s[left]] += 1
            missing += 1
            left += 1
    return best
""",
    js="""\
function minWindow(s, t) {
    const need = {};
    for (const c of t) need[c] = (need[c]||0) + 1;
    let missing = t.length, left = 0, best = '';
    for (let r = 0; r < s.length; r++) {
        if (need[s[r]]-- > 0) missing--;
        while (!missing) {
            const w = s.slice(left, r+1);
            if (!best || w.length < best.length) best = w;
            if (++need[s[left++]] > 0) missing++;
        }
    }
    return best;
}
""",
    ts="""\
function minWindow(s: string, t: string): string {
    const need: Record<string,number> = {};
    for (const c of t) need[c] = (need[c]||0) + 1;
    let missing = t.length, left = 0, best = '';
    for (let r = 0; r < s.length; r++) {
        if ((need[s[r]]-- ?? 0) > 0) missing--;
        while (!missing) {
            const w = s.slice(left, r+1);
            if (!best || w.length < best.length) best = w;
            if (++need[s[left++]] > 0) missing++;
        }
    }
    return best;
}
""",
    java="""\
import java.util.HashMap;
class Solution {
    public String minWindow(String s, String t) {
        HashMap<Character,Integer> need = new HashMap<>();
        for (char c : t.toCharArray()) need.merge(c,1,Integer::sum);
        int missing=t.length(), left=0, start=0, minLen=Integer.MAX_VALUE;
        for (int r=0;r<s.length();r++) {
            char c=s.charAt(r);
            if (need.getOrDefault(c,0)>0) missing--;
            need.merge(c,-1,Integer::sum);
            while (missing==0) {
                if (r-left+1<minLen) { minLen=r-left+1; start=left; }
                char lc=s.charAt(left++);
                need.merge(lc,1,Integer::sum);
                if (need.get(lc)>0) missing++;
            }
        }
        return minLen==Integer.MAX_VALUE?"":s.substring(start,start+minLen);
    }
}
""",
    cpp="""\
#include <string>
#include <unordered_map>
#include <climits>
using namespace std;
class Solution {
public:
    string minWindow(string s, string t) {
        unordered_map<char,int> need;
        for (char c:t) need[c]++;
        int missing=t.size(),left=0,start=0,minLen=INT_MAX;
        for (int r=0;r<(int)s.size();r++){
            if(need[s[r]]-->0) missing--;
            while(!missing){
                if(r-left+1<minLen){minLen=r-left+1;start=left;}
                if(++need[s[left++]]>0) missing++;
            }
        }
        return minLen==INT_MAX?"":s.substr(start,minLen);
    }
};
""",
    go="""\
func minWindow(s string, t string) string {
    need := make(map[byte]int)
    for i := range t { need[t[i]]++ }
    missing, left, start, minLen := len(t), 0, 0, len(s)+1
    for r := 0; r < len(s); r++ {
        if need[s[r]] > 0 { missing-- }
        need[s[r]]--
        for missing == 0 {
            if r-left+1 < minLen { minLen = r-left+1; start = left }
            need[s[left]]++
            if need[s[left]] > 0 { missing++ }
            left++
        }
    }
    if minLen > len(s) { return "" }
    return s[start:start+minLen]
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": 's="ADOBECODEBANC", t="ABC"', "expected_display": '"BANC"'},
    {"label": "Test 2", "input_display": 's="a", t="a"',               "expected_display": '"a"'},
    {"label": "Test 3", "input_display": 's="a", t="aa"',              "expected_display": '""'},
  ],
},

# ── 4. N-Queens ────────────────────────────────────────────────────────────────
{
  "slug": "n-queens",
  "title": "N-Queens",
  "difficulty": "hard",
  "description": (
    "The n-queens puzzle is the problem of placing `n` queens on an `n × n` "
    "chessboard such that no two queens attack each other.\n\n"
    "Given an integer `n`, return all distinct solutions to the n-queens puzzle. "
    "You may return the answer in any order.\n\n"
    "Each solution contains a distinct board configuration of the n-queens' "
    "placement, where `'Q'` and `'.'` both indicate a queen and an empty space."
  ),
  "examples": [
    {"input": "n = 4",
     "output": '[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],["..Q.",\"Q...\",\"...Q\",\".Q..\"]]',
     "explanation": "There are two distinct solutions to the 4-queens puzzle."},
    {"input": "n = 1", "output": '[["Q"]]'},
  ],
  "constraints": ["1 ≤ n ≤ 9"],
  "starter_code": sc(
    py="""\
def solve_n_queens(n: int) -> list[list[str]]:
    results = []
    cols = set()
    diag1 = set()  # row - col
    diag2 = set()  # row + col
    board = [['.' ] * n for _ in range(n)]

    def backtrack(row):
        if row == n:
            results.append([''.join(r) for r in board])
            return
        for col in range(n):
            if col in cols or (row-col) in diag1 or (row+col) in diag2:
                continue
            cols.add(col); diag1.add(row-col); diag2.add(row+col)
            board[row][col] = 'Q'
            backtrack(row + 1)
            board[row][col] = '.'
            cols.remove(col); diag1.remove(row-col); diag2.remove(row+col)

    backtrack(0)
    return results
""",
    js="""\
function solveNQueens(n) {
    const res = [], board = Array.from({length:n},()=>Array(n).fill('.'));
    const cols=new Set(), d1=new Set(), d2=new Set();
    const bt = row => {
        if (row===n) { res.push(board.map(r=>r.join(''))); return; }
        for (let c=0;c<n;c++) {
            if (cols.has(c)||d1.has(row-c)||d2.has(row+c)) continue;
            cols.add(c);d1.add(row-c);d2.add(row+c);board[row][c]='Q';
            bt(row+1);
            cols.delete(c);d1.delete(row-c);d2.delete(row+c);board[row][c]='.';
        }
    };
    bt(0); return res;
}
""",
    ts="""\
function solveNQueens(n: number): string[][] {
    const res: string[][] = [];
    const board = Array.from({length:n},()=>Array<string>(n).fill('.'));
    const cols=new Set<number>(), d1=new Set<number>(), d2=new Set<number>();
    const bt = (row: number) => {
        if (row===n) { res.push(board.map(r=>r.join(''))); return; }
        for (let c=0;c<n;c++) {
            if (cols.has(c)||d1.has(row-c)||d2.has(row+c)) continue;
            cols.add(c);d1.add(row-c);d2.add(row+c);board[row][c]='Q';
            bt(row+1);
            cols.delete(c);d1.delete(row-c);d2.delete(row+c);board[row][c]='.';
        }
    };
    bt(0); return res;
}
""",
    java="""\
import java.util.*;
class Solution {
    private List<List<String>> res = new ArrayList<>();
    private Set<Integer> cols=new HashSet<>(), d1=new HashSet<>(), d2=new HashSet<>();
    private char[][] board;
    public List<List<String>> solveNQueens(int n) {
        board = new char[n][n];
        for (char[] row : board) Arrays.fill(row,'.');
        bt(0, n); return res;
    }
    void bt(int row, int n) {
        if (row==n) {
            List<String> sol=new ArrayList<>();
            for (char[] r:board) sol.add(new String(r));
            res.add(sol); return;
        }
        for (int c=0;c<n;c++) {
            if (cols.contains(c)||d1.contains(row-c)||d2.contains(row+c)) continue;
            cols.add(c);d1.add(row-c);d2.add(row+c);board[row][c]='Q';
            bt(row+1,n);
            cols.remove(c);d1.remove(row-c);d2.remove(row+c);board[row][c]='.';
        }
    }
}
""",
    cpp="""\
#include <vector>
#include <string>
#include <unordered_set>
using namespace std;
class Solution {
    vector<vector<string>> res;
    unordered_set<int> cols,d1,d2;
    void bt(vector<string>& board, int row, int n) {
        if (row==n) { res.push_back(board); return; }
        for (int c=0;c<n;c++) {
            if (cols.count(c)||d1.count(row-c)||d2.count(row+c)) continue;
            cols.insert(c);d1.insert(row-c);d2.insert(row+c);board[row][c]='Q';
            bt(board,row+1,n);
            cols.erase(c);d1.erase(row-c);d2.erase(row+c);board[row][c]='.';
        }
    }
public:
    vector<vector<string>> solveNQueens(int n) {
        vector<string> board(n, string(n,'.'));
        bt(board,0,n); return res;
    }
};
""",
    go="""\
func solveNQueens(n int) [][]string {
    var res [][]string
    board := make([][]byte, n)
    for i := range board { board[i] = make([]byte, n); for j := range board[i] { board[i][j]='.' } }
    cols,d1,d2 := map[int]bool{},map[int]bool{},map[int]bool{}
    var bt func(row int)
    bt = func(row int) {
        if row==n {
            sol := make([]string,n); for i,r:=range board { sol[i]=string(r) }
            res=append(res,sol); return
        }
        for c:=0;c<n;c++ {
            if cols[c]||d1[row-c]||d2[row+c] { continue }
            cols[c]=true;d1[row-c]=true;d2[row+c]=true;board[row][c]='Q'
            bt(row+1)
            delete(cols,c);delete(d1,row-c);delete(d2,row+c);board[row][c]='.'
        }
    }
    bt(0); return res
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "n = 4", "expected_display": "2 solutions"},
    {"label": "Test 2", "input_display": "n = 1", "expected_display": '[["Q"]]'},
  ],
},

# ── 5. Sliding Window Maximum ─────────────────────────────────────────────────
{
  "slug": "sliding-window-maximum",
  "title": "Sliding Window Maximum",
  "difficulty": "hard",
  "description": (
    "You are given an array of integers `nums`, there is a sliding window of "
    "size `k` which is moving from the very left of the array to the very right. "
    "You can only see the `k` numbers in the window. Each time the sliding "
    "window moves right by one position.\n\n"
    "Return the max sliding window."
  ),
  "examples": [
    {"input": "nums = [1,3,-1,-3,5,3,6,7], k = 3",
     "output": "[3,3,5,5,6,7]",
     "explanation": "Window positions and their max: [1,3,-1]→3, [3,-1,-3]→3, [-1,-3,5]→5, [-3,5,3]→5, [5,3,6]→6, [3,6,7]→7."},
    {"input": "nums = [1], k = 1", "output": "[1]"},
  ],
  "constraints": [
    "1 ≤ nums.length ≤ 10⁵",
    "-10⁴ ≤ nums[i] ≤ 10⁴",
    "1 ≤ k ≤ nums.length",
  ],
  "notes": "Monotonic deque gives O(n) time.",
  "starter_code": sc(
    py="""\
from collections import deque
def max_sliding_window(nums: list[int], k: int) -> list[int]:
    dq = deque()  # stores indices, decreasing values
    result = []
    for i, num in enumerate(nums):
        while dq and nums[dq[-1]] <= num:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            result.append(nums[dq[0]])
    return result
""",
    js="""\
function maxSlidingWindow(nums, k) {
    const dq = [], result = [];
    for (let i = 0; i < nums.length; i++) {
        while (dq.length && nums[dq[dq.length-1]] <= nums[i]) dq.pop();
        dq.push(i);
        if (dq[0] <= i-k) dq.shift();
        if (i >= k-1) result.push(nums[dq[0]]);
    }
    return result;
}
""",
    ts="""\
function maxSlidingWindow(nums: number[], k: number): number[] {
    const dq: number[] = [], result: number[] = [];
    for (let i = 0; i < nums.length; i++) {
        while (dq.length && nums[dq[dq.length-1]] <= nums[i]) dq.pop();
        dq.push(i);
        if (dq[0] <= i-k) dq.shift();
        if (i >= k-1) result.push(nums[dq[0]]);
    }
    return result;
}
""",
    java="""\
import java.util.ArrayDeque;
class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        int[] result = new int[nums.length - k + 1];
        ArrayDeque<Integer> dq = new ArrayDeque<>();
        for (int i = 0; i < nums.length; i++) {
            while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast();
            dq.addLast(i);
            if (dq.peekFirst() <= i-k) dq.pollFirst();
            if (i >= k-1) result[i-k+1] = nums[dq.peekFirst()];
        }
        return result;
    }
}
""",
    cpp="""\
#include <vector>
#include <deque>
using namespace std;
class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        deque<int> dq;
        vector<int> result;
        for (int i=0;i<(int)nums.size();i++) {
            while (!dq.empty() && nums[dq.back()]<=nums[i]) dq.pop_back();
            dq.push_back(i);
            if (dq.front()<=i-k) dq.pop_front();
            if (i>=k-1) result.push_back(nums[dq.front()]);
        }
        return result;
    }
};
""",
    go="""\
func maxSlidingWindow(nums []int, k int) []int {
    dq := []int{}
    result := []int{}
    for i, num := range nums {
        for len(dq) > 0 && nums[dq[len(dq)-1]] <= num { dq = dq[:len(dq)-1] }
        dq = append(dq, i)
        if dq[0] <= i-k { dq = dq[1:] }
        if i >= k-1 { result = append(result, nums[dq[0]]) }
    }
    return result
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "nums=[1,3,-1,-3,5,3,6,7], k=3", "expected_display": "[3,3,5,5,6,7]"},
    {"label": "Test 2", "input_display": "nums=[1], k=1",                  "expected_display": "[1]"},
    {"label": "Test 3", "input_display": "nums=[1,-1], k=1",               "expected_display": "[1,-1]"},
  ],
},

# ── 6. Regular Expression Matching ───────────────────────────────────────────
{
  "slug": "regular-expression-matching",
  "title": "Regular Expression Matching",
  "difficulty": "hard",
  "description": (
    "Given an input string `s` and a pattern `p`, implement regular expression "
    "matching with support for `'.'` and `'*'` where:\n\n"
    "- `'.'` Matches any single character.\n"
    "- `'*'` Matches zero or more of the preceding element.\n\n"
    "The matching should cover the entire input string (not partial)."
  ),
  "examples": [
    {"input": 's="aa", p="a"',  "output": "false",
     "explanation": '"aa" cannot be matched by the pattern "a".'},
    {"input": 's="aa", p="a*"', "output": "true",
     "explanation": '"*" means zero or more "a"s. "aa" is matched.'},
    {"input": 's="ab", p=".*"', "output": "true",
     "explanation": '".*" matches any sequence.'},
  ],
  "constraints": [
    "1 ≤ s.length ≤ 20",
    "1 ≤ p.length ≤ 20",
    "s contains only lowercase English letters.",
    "p contains only lowercase English letters, '.', and '*'.",
    "It is guaranteed for each occurrence of '*', there will be a previous valid character to match.",
  ],
  "starter_code": sc(
    py="""\
def is_match(s: str, p: str) -> bool:
    m, n = len(s), len(p)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = True
    for j in range(2, n + 1):
        if p[j-1] == '*':
            dp[0][j] = dp[0][j-2]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j-1] == '*':
                dp[i][j] = dp[i][j-2]  # zero occurrences
                if p[j-2] == '.' or p[j-2] == s[i-1]:
                    dp[i][j] |= dp[i-1][j]  # one or more
            elif p[j-1] == '.' or p[j-1] == s[i-1]:
                dp[i][j] = dp[i-1][j-1]
    return dp[m][n]
""",
    js="""\
function isMatch(s, p) {
    const m=s.length, n=p.length;
    const dp=Array.from({length:m+1},()=>Array(n+1).fill(false));
    dp[0][0]=true;
    for (let j=2;j<=n;j++) if(p[j-1]==='*') dp[0][j]=dp[0][j-2];
    for (let i=1;i<=m;i++) for (let j=1;j<=n;j++) {
        if (p[j-1]==='*') {
            dp[i][j]=dp[i][j-2];
            if (p[j-2]==='.'||p[j-2]===s[i-1]) dp[i][j]|=dp[i-1][j];
        } else if (p[j-1]==='.'||p[j-1]===s[i-1]) dp[i][j]=dp[i-1][j-1];
    }
    return dp[m][n];
}
""",
    ts="""\
function isMatch(s: string, p: string): boolean {
    const m=s.length, n=p.length;
    const dp=Array.from({length:m+1},()=>Array(n+1).fill(false));
    dp[0][0]=true;
    for (let j=2;j<=n;j++) if(p[j-1]==='*') dp[0][j]=dp[0][j-2];
    for (let i=1;i<=m;i++) for (let j=1;j<=n;j++) {
        if (p[j-1]==='*') {
            dp[i][j]=dp[i][j-2];
            if (p[j-2]==='.'||p[j-2]===s[i-1]) dp[i][j]|=dp[i-1][j];
        } else if (p[j-1]==='.'||p[j-1]===s[i-1]) dp[i][j]=dp[i-1][j-1];
    }
    return dp[m][n];
}
""",
    java="""\
class Solution {
    public boolean isMatch(String s, String p) {
        int m=s.length(), n=p.length();
        boolean[][] dp=new boolean[m+1][n+1];
        dp[0][0]=true;
        for (int j=2;j<=n;j++) if(p.charAt(j-1)=='*') dp[0][j]=dp[0][j-2];
        for (int i=1;i<=m;i++) for (int j=1;j<=n;j++) {
            if (p.charAt(j-1)=='*') {
                dp[i][j]=dp[i][j-2];
                if (p.charAt(j-2)=='.'||p.charAt(j-2)==s.charAt(i-1)) dp[i][j]|=dp[i-1][j];
            } else if (p.charAt(j-1)=='.'||p.charAt(j-1)==s.charAt(i-1)) dp[i][j]=dp[i-1][j-1];
        }
        return dp[m][n];
    }
}
""",
    cpp="""\
#include <string>
#include <vector>
using namespace std;
class Solution {
public:
    bool isMatch(string s, string p) {
        int m=s.size(), n=p.size();
        vector<vector<bool>> dp(m+1,vector<bool>(n+1,false));
        dp[0][0]=true;
        for (int j=2;j<=n;j++) if(p[j-1]=='*') dp[0][j]=dp[0][j-2];
        for (int i=1;i<=m;i++) for (int j=1;j<=n;j++) {
            if (p[j-1]=='*') {
                dp[i][j]=dp[i][j-2];
                if (p[j-2]=='.'||p[j-2]==s[i-1]) dp[i][j]|=dp[i-1][j];
            } else if (p[j-1]=='.'||p[j-1]==s[i-1]) dp[i][j]=dp[i-1][j-1];
        }
        return dp[m][n];
    }
};
""",
    go="""\
func isMatch(s string, p string) bool {
    m, n := len(s), len(p)
    dp := make([][]bool, m+1)
    for i := range dp { dp[i] = make([]bool, n+1) }
    dp[0][0] = true
    for j := 2; j <= n; j++ { if p[j-1]=='*' { dp[0][j]=dp[0][j-2] } }
    for i := 1; i <= m; i++ {
        for j := 1; j <= n; j++ {
            if p[j-1]=='*' {
                dp[i][j]=dp[i][j-2]
                if p[j-2]=='.'||p[j-2]==s[i-1] { dp[i][j]=dp[i][j]||dp[i-1][j] }
            } else if p[j-1]=='.'||p[j-1]==s[i-1] { dp[i][j]=dp[i-1][j-1] }
        }
    }
    return dp[m][n]
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": 's="aa", p="a"',   "expected_display": "false"},
    {"label": "Test 2", "input_display": 's="aa", p="a*"',  "expected_display": "true"},
    {"label": "Test 3", "input_display": 's="ab", p=".*"',  "expected_display": "true"},
    {"label": "Test 4", "input_display": 's="aab", p="c*a*b"',"expected_display": "true"},
  ],
},

# ── 7. Largest Rectangle in Histogram ─────────────────────────────────────────
{
  "slug": "largest-rectangle-in-histogram",
  "title": "Largest Rectangle in Histogram",
  "difficulty": "hard",
  "description": (
    "Given an array of integers `heights` representing the histogram's bar "
    "height where the width of each bar is 1, return the area of the largest "
    "rectangle in the histogram."
  ),
  "examples": [
    {"input": "heights = [2,1,5,6,2,3]", "output": "10",
     "explanation": "The largest rectangle has area = 5 * 2 = 10 (bars at index 2 and 3)."},
    {"input": "heights = [2,4]",         "output": "4"},
  ],
  "constraints": [
    "1 ≤ heights.length ≤ 10⁵",
    "0 ≤ heights[i] ≤ 10⁴",
  ],
  "notes": "Monotonic stack gives O(n) time and O(n) space.",
  "starter_code": sc(
    py="""\
def largest_rectangle_area(heights: list[int]) -> int:
    stack = []  # (index, height)
    max_area = 0
    for i, h in enumerate(heights):
        start = i
        while stack and stack[-1][1] > h:
            idx, height = stack.pop()
            max_area = max(max_area, height * (i - idx))
            start = idx
        stack.append((start, h))
    for idx, height in stack:
        max_area = max(max_area, height * (len(heights) - idx))
    return max_area
""",
    js="""\
function largestRectangleArea(heights) {
    const stack = [];
    let maxArea = 0;
    for (let i = 0; i <= heights.length; i++) {
        const h = i === heights.length ? 0 : heights[i];
        let start = i;
        while (stack.length && stack[stack.length-1][1] > h) {
            const [idx, height] = stack.pop();
            maxArea = Math.max(maxArea, height * (i - idx));
            start = idx;
        }
        stack.push([start, h]);
    }
    return maxArea;
}
""",
    ts="""\
function largestRectangleArea(heights: number[]): number {
    const stack: [number,number][] = [];
    let maxArea = 0;
    for (let i = 0; i <= heights.length; i++) {
        const h = i === heights.length ? 0 : heights[i];
        let start = i;
        while (stack.length && stack[stack.length-1][1] > h) {
            const [idx, height] = stack.pop()!;
            maxArea = Math.max(maxArea, height * (i - idx));
            start = idx;
        }
        stack.push([start, h]);
    }
    return maxArea;
}
""",
    java="""\
import java.util.Stack;
class Solution {
    public int largestRectangleArea(int[] heights) {
        Stack<int[]> stack = new Stack<>();
        int maxArea = 0;
        for (int i = 0; i <= heights.length; i++) {
            int h = i == heights.length ? 0 : heights[i];
            int start = i;
            while (!stack.isEmpty() && stack.peek()[1] > h) {
                int[] top = stack.pop();
                maxArea = Math.max(maxArea, top[1] * (i - top[0]));
                start = top[0];
            }
            stack.push(new int[]{start, h});
        }
        return maxArea;
    }
}
""",
    cpp="""\
#include <vector>
#include <stack>
#include <algorithm>
using namespace std;
class Solution {
public:
    int largestRectangleArea(vector<int>& heights) {
        stack<pair<int,int>> st;
        int maxArea = 0;
        for (int i = 0; i <= (int)heights.size(); i++) {
            int h = i==(int)heights.size() ? 0 : heights[i];
            int start = i;
            while (!st.empty() && st.top().second > h) {
                auto [idx, height] = st.top(); st.pop();
                maxArea = max(maxArea, height*(i-idx));
                start = idx;
            }
            st.push({start, h});
        }
        return maxArea;
    }
};
""",
    go="""\
func largestRectangleArea(heights []int) int {
    type pair struct{ idx, h int }
    stack := []pair{}
    maxArea := 0
    for i := 0; i <= len(heights); i++ {
        h := 0; if i < len(heights) { h = heights[i] }
        start := i
        for len(stack) > 0 && stack[len(stack)-1].h > h {
            top := stack[len(stack)-1]; stack = stack[:len(stack)-1]
            if a := top.h*(i-top.idx); a > maxArea { maxArea = a }
            start = top.idx
        }
        stack = append(stack, pair{start, h})
    }
    return maxArea
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "heights=[2,1,5,6,2,3]", "expected_display": "10"},
    {"label": "Test 2", "input_display": "heights=[2,4]",          "expected_display": "4"},
    {"label": "Test 3", "input_display": "heights=[1]",            "expected_display": "1"},
  ],
},

# ── 8. Word Break II ──────────────────────────────────────────────────────────
{
  "slug": "word-break-ii",
  "title": "Word Break II",
  "difficulty": "hard",
  "description": (
    "Given a string `s` and a dictionary of strings `wordDict`, add spaces in "
    "`s` to construct a sentence where each word is a valid dictionary word. "
    "Return all such possible sentences in any order.\n\n"
    "Note that the same word in the dictionary may be reused multiple times in "
    "the segmentation."
  ),
  "examples": [
    {"input": 's="catsanddog", wordDict=["cat","cats","and","sand","dog"]',
     "output": '["cats and dog","cat sand dog"]'},
    {"input": 's="pineapplepenapple", wordDict=["apple","pen","applepen","pine","pineapple"]',
     "output": '["pine apple pen apple","pineapple pen apple","pine applepen apple"]'},
    {"input": 's="catsandog", wordDict=["cats","dog","sand","and","cat"]',
     "output": "[]"},
  ],
  "constraints": [
    "1 ≤ s.length ≤ 20",
    "1 ≤ wordDict.length ≤ 1000",
    "1 ≤ wordDict[i].length ≤ 10",
    "s and wordDict[i] consist of only lowercase English letters.",
    "All strings in wordDict are unique.",
  ],
  "starter_code": sc(
    py="""\
from functools import lru_cache
def word_break(s: str, wordDict: list[str]) -> list[str]:
    words = set(wordDict)

    @lru_cache(maxsize=None)
    def dp(start: int) -> list[str]:
        if start == len(s):
            return [""]
        sentences = []
        for end in range(start + 1, len(s) + 1):
            word = s[start:end]
            if word in words:
                for rest in dp(end):
                    sentences.append(word + (" " + rest if rest else ""))
        return sentences

    return dp(0)
""",
    js="""\
function wordBreak(s, wordDict) {
    const words = new Set(wordDict), memo = new Map();
    const dp = start => {
        if (start === s.length) return [''];
        if (memo.has(start)) return memo.get(start);
        const res = [];
        for (let end = start+1; end <= s.length; end++) {
            const word = s.slice(start, end);
            if (words.has(word))
                for (const rest of dp(end))
                    res.push(word + (rest ? ' '+rest : ''));
        }
        memo.set(start, res); return res;
    };
    return dp(0);
}
""",
    ts="""\
function wordBreak(s: string, wordDict: string[]): string[] {
    const words = new Set(wordDict), memo = new Map<number,string[]>();
    const dp = (start: number): string[] => {
        if (start === s.length) return [''];
        if (memo.has(start)) return memo.get(start)!;
        const res: string[] = [];
        for (let end = start+1; end <= s.length; end++) {
            const word = s.slice(start, end);
            if (words.has(word))
                for (const rest of dp(end))
                    res.push(word + (rest ? ' '+rest : ''));
        }
        memo.set(start, res); return res;
    };
    return dp(0);
}
""",
    java="""\
import java.util.*;
class Solution {
    private Set<String> words; private Map<Integer,List<String>> memo; private String s;
    public List<String> wordBreak(String s, List<String> wordDict) {
        this.s=s; words=new HashSet<>(wordDict); memo=new HashMap<>();
        return dp(0);
    }
    List<String> dp(int start) {
        if (start==s.length()) return Arrays.asList("");
        if (memo.containsKey(start)) return memo.get(start);
        List<String> res=new ArrayList<>();
        for (int end=start+1;end<=s.length();end++) {
            String word=s.substring(start,end);
            if (words.contains(word))
                for (String rest:dp(end))
                    res.add(word+(rest.isEmpty()?"":" "+rest));
        }
        memo.put(start,res); return res;
    }
}
""",
    cpp="""\
#include <vector>
#include <string>
#include <unordered_set>
#include <unordered_map>
using namespace std;
class Solution {
    unordered_set<string> words;
    unordered_map<int,vector<string>> memo;
    string s;
    vector<string> dp(int start) {
        if (start==(int)s.size()) return {""};
        if (memo.count(start)) return memo[start];
        vector<string> res;
        for (int end=start+1;end<=(int)s.size();end++) {
            string word=s.substr(start,end-start);
            if (words.count(word))
                for (auto& rest:dp(end))
                    res.push_back(word+(rest.empty()?"":" "+rest));
        }
        return memo[start]=res;
    }
public:
    vector<string> wordBreak(string s, vector<string>& wordDict) {
        this->s=s; words={wordDict.begin(),wordDict.end()};
        return dp(0);
    }
};
""",
    go="""\
func wordBreak(s string, wordDict []string) []string {
    words := make(map[string]bool)
    for _, w := range wordDict { words[w] = true }
    memo := make(map[int][]string)
    var dp func(start int) []string
    dp = func(start int) []string {
        if start == len(s) { return []string{""} }
        if v, ok := memo[start]; ok { return v }
        var res []string
        for end := start+1; end <= len(s); end++ {
            word := s[start:end]
            if words[word] {
                for _, rest := range dp(end) {
                    if rest == "" { res = append(res, word) } else { res = append(res, word+" "+rest) }
                }
            }
        }
        memo[start] = res; return res
    }
    return dp(0)
}
""",
  ),
  "test_cases": [
    {"label": "Test 1",
     "input_display": 's="catsanddog", wordDict=["cat","cats","and","sand","dog"]',
     "expected_display": '["cats and dog","cat sand dog"]'},
    {"label": "Test 2",
     "input_display": 's="catsandog", wordDict=["cats","dog","sand","and","cat"]',
     "expected_display": "[]"},
  ],
},

# ── 9. Merge k Sorted Lists ───────────────────────────────────────────────────
{
  "slug": "merge-k-sorted-lists",
  "title": "Merge k Sorted Lists",
  "difficulty": "hard",
  "description": (
    "You are given an array of `k` linked-lists `lists`, each linked-list is "
    "sorted in ascending order.\n\n"
    "Merge all the linked-lists into one sorted linked-list and return it."
  ),
  "examples": [
    {"input": "lists = [[1,4,5],[1,3,4],[2,6]]",
     "output": "[1,1,2,3,4,4,5,6]"},
    {"input": "lists = []",      "output": "[]"},
    {"input": "lists = [[]]",    "output": "[]"},
  ],
  "constraints": [
    "k == lists.length",
    "0 ≤ k ≤ 10⁴",
    "0 ≤ lists[i].length ≤ 500",
    "-10⁴ ≤ lists[i][j] ≤ 10⁴",
    "lists[i] is sorted in ascending order.",
    "The sum of lists[i].length will not exceed 10⁴.",
  ],
  "notes": "Min-heap approach is O(N log k); divide & conquer merge is also O(N log k).",
  "starter_code": sc(
    py="""\
import heapq
from typing import Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def merge_k_lists(lists: list[Optional[ListNode]]) -> Optional[ListNode]:
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))
    dummy = ListNode(0)
    cur = dummy
    while heap:
        val, i, node = heapq.heappop(heap)
        cur.next = node
        cur = cur.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
""",
    js="""\
class ListNode {
    constructor(val=0, next=null) { this.val=val; this.next=next; }
}
function mergeKLists(lists) {
    if (!lists.length) return null;
    while (lists.length > 1) {
        const merged = [];
        for (let i = 0; i < lists.length; i += 2)
            merged.push(mergeTwoLists(lists[i], lists[i+1]||null));
        lists = merged;
    }
    return lists[0];
}
function mergeTwoLists(a, b) {
    const dummy = new ListNode(); let cur = dummy;
    while (a && b) { if(a.val<=b.val){cur.next=a;a=a.next;}else{cur.next=b;b=b.next;} cur=cur.next; }
    cur.next = a || b; return dummy.next;
}
""",
    ts="""\
class ListNode { val:number; next:ListNode|null;
    constructor(val=0,next:ListNode|null=null){this.val=val;this.next=next;} }
function mergeKLists(lists: Array<ListNode|null>): ListNode|null {
    if (!lists.length) return null;
    while (lists.length > 1) {
        const merged: Array<ListNode|null> = [];
        for (let i=0;i<lists.length;i+=2) merged.push(merge2(lists[i],lists[i+1]??null));
        lists = merged;
    }
    return lists[0];
}
function merge2(a:ListNode|null, b:ListNode|null): ListNode|null {
    const d=new ListNode(); let c=d;
    while(a&&b){if(a.val<=b.val){c.next=a;a=a.next;}else{c.next=b;b=b.next;}c=c.next!;}
    c.next=a||b; return d.next;
}
""",
    java="""\
import java.util.PriorityQueue;
class ListNode { int val; ListNode next; ListNode(int v){val=v;} }
class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        PriorityQueue<ListNode> pq = new PriorityQueue<>((a,b)->a.val-b.val);
        for (ListNode node : lists) if (node!=null) pq.offer(node);
        ListNode dummy=new ListNode(0), cur=dummy;
        while (!pq.isEmpty()) {
            cur.next=pq.poll(); cur=cur.next;
            if (cur.next!=null) pq.offer(cur.next);
        }
        return dummy.next;
    }
}
""",
    cpp="""\
#include <vector>
#include <queue>
using namespace std;
struct ListNode { int val; ListNode* next; ListNode(int v):val(v),next(nullptr){} };
class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        auto cmp=[](ListNode* a,ListNode* b){return a->val>b->val;};
        priority_queue<ListNode*,vector<ListNode*>,decltype(cmp)> pq(cmp);
        for (auto n:lists) if(n) pq.push(n);
        ListNode dummy(0); ListNode* cur=&dummy;
        while (!pq.empty()) {
            cur->next=pq.top(); pq.pop(); cur=cur->next;
            if (cur->next) pq.push(cur->next);
        }
        return dummy.next;
    }
};
""",
    go="""\
import "container/heap"
type ListNode struct { Val int; Next *ListNode }
type MinHeap []*ListNode
func (h MinHeap) Len() int { return len(h) }
func (h MinHeap) Less(i,j int) bool { return h[i].Val < h[j].Val }
func (h MinHeap) Swap(i,j int) { h[i],h[j]=h[j],h[i] }
func (h *MinHeap) Push(x interface{}) { *h=append(*h,x.(*ListNode)) }
func (h *MinHeap) Pop() interface{} { old:=*h; n:=len(old); x:=old[n-1]; *h=old[:n-1]; return x }
func mergeKLists(lists []*ListNode) *ListNode {
    h := &MinHeap{}; heap.Init(h)
    for _,n:=range lists { if n!=nil { heap.Push(h,n) } }
    dummy:=&ListNode{}; cur:=dummy
    for h.Len()>0 {
        node:=heap.Pop(h).(*ListNode); cur.Next=node; cur=cur.Next
        if node.Next!=nil { heap.Push(h,node.Next) }
    }
    return dummy.Next
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": "lists=[[1,4,5],[1,3,4],[2,6]]", "expected_display": "[1,1,2,3,4,4,5,6]"},
    {"label": "Test 2", "input_display": "lists=[]",                       "expected_display": "[]"},
    {"label": "Test 3", "input_display": "lists=[[1]]",                    "expected_display": "[1]"},
  ],
},

# ── 10. Edit Distance ─────────────────────────────────────────────────────────
{
  "slug": "edit-distance",
  "title": "Edit Distance",
  "difficulty": "hard",
  "description": (
    "Given two strings `word1` and `word2`, return the minimum number of "
    "operations required to convert `word1` to `word2`.\n\n"
    "You have the following three operations permitted on a word:\n"
    "- Insert a character\n"
    "- Delete a character\n"
    "- Replace a character"
  ),
  "examples": [
    {"input": 'word1="horse", word2="ros"', "output": "3",
     "explanation": "horse→rorse (replace 'h'→'r'), rorse→rose (delete 'r'), rose→ros (delete 'e')."},
    {"input": 'word1="intention", word2="execution"', "output": "5"},
  ],
  "constraints": [
    "0 ≤ word1.length, word2.length ≤ 500",
    "word1 and word2 consist of lowercase English letters.",
  ],
  "starter_code": sc(
    py="""\
def min_distance(word1: str, word2: str) -> int:
    m, n = len(word1), len(word2)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev = dp[0]
        dp[0] = i
        for j in range(1, n + 1):
            temp = dp[j]
            if word1[i-1] == word2[j-1]:
                dp[j] = prev
            else:
                dp[j] = 1 + min(prev, dp[j], dp[j-1])
            prev = temp
    return dp[n]
""",
    js="""\
function minDistance(word1, word2) {
    const m=word1.length, n=word2.length;
    let dp=Array.from({length:n+1},(_,i)=>i);
    for (let i=1;i<=m;i++) {
        let prev=dp[0]; dp[0]=i;
        for (let j=1;j<=n;j++) {
            const temp=dp[j];
            dp[j]=word1[i-1]===word2[j-1]?prev:1+Math.min(prev,dp[j],dp[j-1]);
            prev=temp;
        }
    }
    return dp[n];
}
""",
    ts="""\
function minDistance(word1: string, word2: string): number {
    const m=word1.length, n=word2.length;
    let dp=Array.from({length:n+1},(_,i)=>i);
    for (let i=1;i<=m;i++) {
        let prev=dp[0]; dp[0]=i;
        for (let j=1;j<=n;j++) {
            const temp=dp[j];
            dp[j]=word1[i-1]===word2[j-1]?prev:1+Math.min(prev,dp[j],dp[j-1]);
            prev=temp;
        }
    }
    return dp[n];
}
""",
    java="""\
class Solution {
    public int minDistance(String word1, String word2) {
        int m=word1.length(), n=word2.length();
        int[] dp=new int[n+1];
        for (int j=0;j<=n;j++) dp[j]=j;
        for (int i=1;i<=m;i++) {
            int prev=dp[0]; dp[0]=i;
            for (int j=1;j<=n;j++) {
                int temp=dp[j];
                dp[j]=word1.charAt(i-1)==word2.charAt(j-1)?prev:1+Math.min(prev,Math.min(dp[j],dp[j-1]));
                prev=temp;
            }
        }
        return dp[n];
    }
}
""",
    cpp="""\
#include <string>
#include <vector>
#include <algorithm>
using namespace std;
class Solution {
public:
    int minDistance(string word1, string word2) {
        int m=word1.size(), n=word2.size();
        vector<int> dp(n+1);
        iota(dp.begin(),dp.end(),0);
        for (int i=1;i<=m;i++) {
            int prev=dp[0]; dp[0]=i;
            for (int j=1;j<=n;j++) {
                int temp=dp[j];
                dp[j]=word1[i-1]==word2[j-1]?prev:1+min({prev,dp[j],dp[j-1]});
                prev=temp;
            }
        }
        return dp[n];
    }
};
""",
    go="""\
func minDistance(word1 string, word2 string) int {
    m, n := len(word1), len(word2)
    dp := make([]int, n+1)
    for j := range dp { dp[j] = j }
    for i := 1; i <= m; i++ {
        prev := dp[0]; dp[0] = i
        for j := 1; j <= n; j++ {
            temp := dp[j]
            if word1[i-1] == word2[j-1] {
                dp[j] = prev
            } else {
                dp[j] = 1 + min3(prev, dp[j], dp[j-1])
            }
            prev = temp
        }
    }
    return dp[n]
}
func min3(a, b, c int) int {
    if a < b { b = a }; if b < c { return b }; return c
}
""",
  ),
  "test_cases": [
    {"label": "Test 1", "input_display": 'word1="horse", word2="ros"',       "expected_display": "3"},
    {"label": "Test 2", "input_display": 'word1="intention", word2="execution"', "expected_display": "5"},
    {"label": "Test 3", "input_display": 'word1="", word2=""',               "expected_display": "0"},
  ],
},

]  # end HARD


# ══════════════════════════════════════════════════════════════════════════════
# Seed
# ══════════════════════════════════════════════════════════════════════════════

ALL_QUESTIONS = EASY + MEDIUM + HARD

print(f"Dropping existing questions collection…")
questions_col.drop()

print(f"Inserting {len(ALL_QUESTIONS)} questions…")
result = questions_col.insert_many(ALL_QUESTIONS)
print(f"  Inserted {len(result.inserted_ids)} documents.")

# Create an index on difficulty for fast random sampling
questions_col.create_index("difficulty")
questions_col.create_index("slug", unique=True)
print("  Indexes created.")

counts = {d: questions_col.count_documents({"difficulty": d}) for d in ("easy","medium","hard")}
print(f"\nSeed complete.")
print(f"  Easy:   {counts['easy']}")
print(f"  Medium: {counts['medium']}")
print(f"  Hard:   {counts['hard']}")
