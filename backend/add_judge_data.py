"""
Migration — adds a `judge` field to every question document in MongoDB.
Run from the backend/ directory:
    python add_judge_data.py

judge schema:
{
  "py_fn":       str,          # Python function name to call
  "js_fn":       str,          # JavaScript function name to call
  "cmp":         str,          # comparison mode: exact | sorted_1d | sorted_2d | sorted_str_list | void_inplace | linked_list
  "tests":       [...],        # visible test cases  {"l": label, "a": args, "e": expected}
  "hidden":      [...],        # hidden test cases   {same} + "h": True
}
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()
from app.mongo import questions_col

def tc(label, args, expected, hidden=False):
    d = {"l": label, "a": args, "e": expected}
    if hidden:
        d["h"] = True
    return d

def h(label, args, expected):
    return tc(label, args, expected, hidden=True)


JUDGE = [

# ── 1. Two Sum ────────────────────────────────────────────────────────────────
{
    "slug":  "two-sum",
    "py_fn": "two_sum",
    "js_fn": "twoSum",
    "cmp":   "sorted_1d",
    "tests": [
        tc("Test 1", [[2,7,11,15], 9],   [0,1]),
        tc("Test 2", [[3,2,4],     6],   [1,2]),
        tc("Test 3", [[3,3],       6],   [0,1]),
    ],
    "hidden": [
        h("Hidden 1", [[1,2,3,4,5], 9],  [3,4]),
        h("Hidden 2", [[0,0],       0],  [0,1]),
        h("Hidden 3", [[-1,-2,-3,5,7], 2],  [2,3]),
        h("Hidden 4", [[10,20,30,40], 60],   [1,3]),
        h("Hidden 5", [[100,1,50,99], 100],  [1,3]),
    ],
},

# ── 2. Valid Parentheses ──────────────────────────────────────────────────────
{
    "slug":  "valid-parentheses",
    "py_fn": "is_valid",
    "js_fn": "isValid",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", ["()"],     True),
        tc("Test 2", ["()[]{}"], True),
        tc("Test 3", ["(]"],     False),
        tc("Test 4", ["([)]"],   False),
    ],
    "hidden": [
        h("Hidden 1", ["{[]}"],   True),
        h("Hidden 2", [""],       True),
        h("Hidden 3", ["((("],    False),
        h("Hidden 4", ["]"],      False),
        h("Hidden 5", ["{[()]}"], True),
    ],
},

# ── 3. Maximum Subarray ───────────────────────────────────────────────────────
{
    "slug":  "maximum-subarray",
    "py_fn": "max_sub_array",
    "js_fn": "maxSubArray",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [[-2,1,-3,4,-1,2,1,-5,4]], 6),
        tc("Test 2", [[1]],                      1),
        tc("Test 3", [[5,4,-1,7,8]],             23),
    ],
    "hidden": [
        h("Hidden 1", [[-1]],            -1),
        h("Hidden 2", [[-2,-1]],         -1),
        h("Hidden 3", [[0,-1,2]],         2),
        h("Hidden 4", [[1,-1,2,-1,3]],    4),
        h("Hidden 5", [[-5,-3,-1,-2]],   -1),
    ],
},

# ── 4. Climbing Stairs ────────────────────────────────────────────────────────
{
    "slug":  "climbing-stairs",
    "py_fn": "climb_stairs",
    "js_fn": "climbStairs",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [2], 2),
        tc("Test 2", [3], 3),
        tc("Test 3", [5], 8),
    ],
    "hidden": [
        h("Hidden 1", [1],  1),
        h("Hidden 2", [4],  5),
        h("Hidden 3", [6],  13),
        h("Hidden 4", [10], 89),
        h("Hidden 5", [12], 233),
    ],
},

# ── 5. Best Time to Buy and Sell Stock ────────────────────────────────────────
{
    "slug":  "best-time-to-buy-sell-stock",
    "py_fn": "max_profit",
    "js_fn": "maxProfit",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [[7,1,5,3,6,4]], 5),
        tc("Test 2", [[7,6,4,3,1]],   0),
        tc("Test 3", [[1,2,3,4,5]],   4),
    ],
    "hidden": [
        h("Hidden 1", [[2,4,1]],          2),
        h("Hidden 2", [[1]],              0),
        h("Hidden 3", [[3,3,3,3]],        0),
        h("Hidden 4", [[1,100]],          99),
        h("Hidden 5", [[5,11,3,50,60,90]],87),
    ],
},

# ── 6. Contains Duplicate ─────────────────────────────────────────────────────
{
    "slug":  "contains-duplicate",
    "py_fn": "contains_duplicate",
    "js_fn": "containsDuplicate",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [[1,2,3,1]],            True),
        tc("Test 2", [[1,2,3,4]],            False),
        tc("Test 3", [[1,1,1,3,3,4,3,2,4,2]],True),
    ],
    "hidden": [
        h("Hidden 1", [[1]],      False),
        h("Hidden 2", [[1,1]],    True),
        h("Hidden 3", [[0]],      False),
        h("Hidden 4", [[1,2,3]],  False),
        h("Hidden 5", [[-1,-1]],  True),
    ],
},

# ── 7. Palindrome Number ──────────────────────────────────────────────────────
{
    "slug":  "palindrome-number",
    "py_fn": "is_palindrome",
    "js_fn": "isPalindrome",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [121],  True),
        tc("Test 2", [-121], False),
        tc("Test 3", [10],   False),
    ],
    "hidden": [
        h("Hidden 1", [0],     True),
        h("Hidden 2", [1],     True),
        h("Hidden 3", [1001],  True),
        h("Hidden 4", [12321], True),
        h("Hidden 5", [123],   False),
    ],
},

# ── 8. Reverse String ─────────────────────────────────────────────────────────
{
    "slug":  "reverse-string",
    "py_fn": "reverse_string",
    "js_fn": "reverseString",
    "cmp":   "void_inplace",
    "tests": [
        tc("Test 1", [["h","e","l","l","o"]],       ["o","l","l","e","h"]),
        tc("Test 2", [["H","a","n","n","a","h"]], ["h","a","n","n","a","H"]),
    ],
    "hidden": [
        h("Hidden 1", [["a"]],               ["a"]),
        h("Hidden 2", [["a","b"]],           ["b","a"]),
        h("Hidden 3", [["A","B","C","D","E"]], ["E","D","C","B","A"]),
        h("Hidden 4", [["1","2","3"]],       ["3","2","1"]),
        h("Hidden 5", [["r","a","c","e","c","a","r"]], ["r","a","c","e","c","a","r"]),
    ],
},

# ── 9. Binary Search ──────────────────────────────────────────────────────────
{
    "slug":  "binary-search",
    "py_fn": "search",
    "js_fn": "search",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [[-1,0,3,5,9,12], 9],  4),
        tc("Test 2", [[-1,0,3,5,9,12], 2], -1),
        tc("Test 3", [[5], 5],              0),
    ],
    "hidden": [
        h("Hidden 1", [[1,3,5,7,9,11,13], 7], 3),
        h("Hidden 2", [[1], 2],               -1),
        h("Hidden 3", [[1,2,3,4,5], 1],        0),
        h("Hidden 4", [[1,2,3,4,5], 5],        4),
        h("Hidden 5", [[2,5], 5],              1),
    ],
},

# ── 10. Majority Element ──────────────────────────────────────────────────────
{
    "slug":  "majority-element",
    "py_fn": "majority_element",
    "js_fn": "majorityElement",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [[3,2,3]],           3),
        tc("Test 2", [[2,2,1,1,1,2,2]],  2),
        tc("Test 3", [[1]],              1),
    ],
    "hidden": [
        h("Hidden 1", [[1,1]],          1),
        h("Hidden 2", [[1,2,1]],        1),
        h("Hidden 3", [[6,6,6,7]],      6),
        h("Hidden 4", [[1,1,2,2,2]],    2),
        h("Hidden 5", [[3,3,4,2,3]],    3),
    ],
},

# ── 11. Longest Substring Without Repeating Characters ───────────────────────
{
    "slug":  "longest-substring-without-repeating-characters",
    "py_fn": "length_of_longest_substring",
    "js_fn": "lengthOfLongestSubstring",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", ["abcabcbb"], 3),
        tc("Test 2", ["bbbbb"],    1),
        tc("Test 3", ["pwwkew"],   3),
    ],
    "hidden": [
        h("Hidden 1", [""],     0),
        h("Hidden 2", ["a"],    1),
        h("Hidden 3", ["au"],   2),
        h("Hidden 4", ["dvdf"], 3),
        h("Hidden 5", ["abba"], 2),
    ],
},

# ── 12. 3Sum ──────────────────────────────────────────────────────────────────
{
    "slug":  "3sum",
    "py_fn": "three_sum",
    "js_fn": "threeSum",
    "cmp":   "sorted_2d",
    "tests": [
        tc("Test 1", [[-1,0,1,2,-1,-4]], [[-1,-1,2],[-1,0,1]]),
        tc("Test 2", [[0,1,1]],          []),
        tc("Test 3", [[0,0,0]],          [[0,0,0]]),
    ],
    "hidden": [
        h("Hidden 1", [[-2,0,0,2,2]],      [[-2,0,2]]),
        h("Hidden 2", [[1,2,-3]],          [[-3,1,2]]),
        h("Hidden 3", [[-2,-1,0,1,2,3]],   [[-2,-1,3],[-2,0,2],[-1,0,1]]),
        h("Hidden 4", [[0,0,0,0]],         [[0,0,0]]),
        h("Hidden 5", [[-1,0,0,0,1]],      [[-1,0,1],[0,0,0]]),
    ],
},

# ── 13. Product of Array Except Self ─────────────────────────────────────────
{
    "slug":  "product-of-array-except-self",
    "py_fn": "product_except_self",
    "js_fn": "productExceptSelf",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [[1,2,3,4]],        [24,12,8,6]),
        tc("Test 2", [[-1,1,0,-3,3]],    [0,0,9,0,0]),
    ],
    "hidden": [
        h("Hidden 1", [[2,3]],           [3,2]),
        h("Hidden 2", [[1,1,1,1]],       [1,1,1,1]),
        h("Hidden 3", [[-1,-2,-3,-4]],   [-24,-12,-8,-6]),
        h("Hidden 4", [[5,2,4]],         [8,20,10]),
        h("Hidden 5", [[0,0]],           [0,0]),
    ],
},

# ── 14. Group Anagrams ────────────────────────────────────────────────────────
{
    "slug":  "group-anagrams",
    "py_fn": "group_anagrams",
    "js_fn": "groupAnagrams",
    "cmp":   "sorted_2d",
    "tests": [
        tc("Test 1", [["eat","tea","tan","ate","nat","bat"]],
                     [["ate","eat","tea"],["bat"],["nat","tan"]]),
        tc("Test 2", [[""]], [[""]]),
        tc("Test 3", [["a"]], [["a"]]),
    ],
    "hidden": [
        h("Hidden 1", [["cab","abc","bca","xyz","zyx"]],
                       [["abc","bca","cab"],["xyz","zyx"]]),
        h("Hidden 2", [["ab","ba","cd","dc"]],
                       [["ab","ba"],["cd","dc"]]),
        h("Hidden 3", [["a","b"]],        [["a"],["b"]]),
        h("Hidden 4", [["aab","baa","aba","xyz"]],
                       [["aab","aba","baa"],["xyz"]]),
        h("Hidden 5", [["","","a"]],      [["",""],["a"]]),
    ],
},

# ── 15. Coin Change ───────────────────────────────────────────────────────────
{
    "slug":  "coin-change",
    "py_fn": "coin_change",
    "js_fn": "coinChange",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [[1,5,11], 15],  3),
        tc("Test 2", [[2],       3],  -1),
        tc("Test 3", [[1,2,5],  11],  3),
    ],
    "hidden": [
        h("Hidden 1", [[1],        0],   0),
        h("Hidden 2", [[2,5,10,1],27],   4),
        h("Hidden 3", [[1,5,6,9], 11],   2),
        h("Hidden 4", [[1,2,5], 100],   20),
        h("Hidden 5", [[3],       11],  -1),
    ],
},

# ── 16. Number of Islands ─────────────────────────────────────────────────────
{
    "slug":  "number-of-islands",
    "py_fn": "num_islands",
    "js_fn": "numIslands",
    "cmp":   "exact",
    "tests": [
        tc("Test 1",
           [[["1","1","1","1","0"],["1","1","0","1","0"],
             ["1","1","0","0","0"],["0","0","0","0","0"]]], 1),
        tc("Test 2",
           [[["1","1","0","0","0"],["1","1","0","0","0"],
             ["0","0","1","0","0"],["0","0","0","1","1"]]], 3),
    ],
    "hidden": [
        h("Hidden 1", [[["1"]]],                                          1),
        h("Hidden 2", [[["0"]]],                                          0),
        h("Hidden 3", [[["1","0","1"],["0","1","0"],["1","0","1"]]],      5),
        h("Hidden 4", [[["1","1"],["1","1"]]],                            1),
        h("Hidden 5", [[["1","0"],["0","1"]]],                            2),
    ],
},

# ── 17. Jump Game ─────────────────────────────────────────────────────────────
{
    "slug":  "jump-game",
    "py_fn": "can_jump",
    "js_fn": "canJump",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [[2,3,1,1,4]],  True),
        tc("Test 2", [[3,2,1,0,4]],  False),
        tc("Test 3", [[0]],          True),
    ],
    "hidden": [
        h("Hidden 1", [[1,0]],          True),
        h("Hidden 2", [[2,0,0]],        True),
        h("Hidden 3", [[1,1,2,2,0,1,1]],True),
        h("Hidden 4", [[3,0,0,0,2]],    False),
        h("Hidden 5", [[2,5,0,0]],      True),
    ],
},

# ── 18. Container With Most Water ─────────────────────────────────────────────
{
    "slug":  "container-with-most-water",
    "py_fn": "max_area",
    "js_fn": "maxArea",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [[1,8,6,2,5,4,8,3,7]], 49),
        tc("Test 2", [[1,1]],               1),
        tc("Test 3", [[4,3,2,1,4]],         16),
    ],
    "hidden": [
        h("Hidden 1", [[1,2,1]],              2),
        h("Hidden 2", [[1,3,6]],              3),
        h("Hidden 3", [[6,6]],                6),
        h("Hidden 4", [[2,3,4,5,18,17,6]],   17),
        h("Hidden 5", [[10,9,8,7,6]],         24),
    ],
},

# ── 19. Rotate Image ──────────────────────────────────────────────────────────
{
    "slug":  "rotate-image",
    "py_fn": "rotate",
    "js_fn": "rotate",
    "cmp":   "void_inplace",
    "tests": [
        tc("Test 1", [[[1,2,3],[4,5,6],[7,8,9]]],
                     [[7,4,1],[8,5,2],[9,6,3]]),
        tc("Test 2", [[[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]],
                     [[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]),
    ],
    "hidden": [
        h("Hidden 1", [[[1]]],                [[1]]),
        h("Hidden 2", [[[1,2],[3,4]]],        [[3,1],[4,2]]),
        h("Hidden 3", [[[1,0],[0,1]]],        [[0,1],[1,0]]),
        h("Hidden 4", [[[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]]],
                       [[13,9,5,1],[14,10,6,2],[15,11,7,3],[16,12,8,4]]),
        h("Hidden 5", [[[3,3],[3,3]]],        [[3,3],[3,3]]),
    ],
},

# ── 20. Word Search ───────────────────────────────────────────────────────────
{
    "slug":  "word-search",
    "py_fn": "exist",
    "js_fn": "exist",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"ABCCED"], True),
        tc("Test 2", [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"SEE"],    True),
        tc("Test 3", [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"ABCB"],   False),
    ],
    "hidden": [
        h("Hidden 1", [[["a"]], "a"],                           True),
        h("Hidden 2", [[["a","b"],["c","d"]], "abdc"],          True),
        h("Hidden 3", [[["a","b"],["c","d"]], "abcd"],          False),
        h("Hidden 4", [[["A","B"],["D","C"]], "ABCD"],          True),
        h("Hidden 5", [[["A","A"]], "AAA"],                     False),
    ],
},

# ── 21. Median of Two Sorted Arrays ──────────────────────────────────────────
{
    "slug":  "median-of-two-sorted-arrays",
    "py_fn": "find_median_sorted_arrays",
    "js_fn": "findMedianSortedArrays",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [[1,3], [2]],    2.0),
        tc("Test 2", [[1,2], [3,4]],  2.5),
    ],
    "hidden": [
        h("Hidden 1", [[], [1]],       1.0),
        h("Hidden 2", [[1,3], [2,4]],  2.5),
        h("Hidden 3", [[0,0], [0,0]],  0.0),
        h("Hidden 4", [[1,4], [2,3]],  2.5),
        h("Hidden 5", [[2], [1,3]],    2.0),
    ],
},

# ── 22. Trapping Rain Water ───────────────────────────────────────────────────
{
    "slug":  "trapping-rain-water",
    "py_fn": "trap",
    "js_fn": "trap",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [[0,1,0,2,1,0,1,3,2,1,2,1]], 6),
        tc("Test 2", [[4,2,0,3,2,5]],             9),
        tc("Test 3", [[1,0,1]],                   1),
    ],
    "hidden": [
        h("Hidden 1", [[]], 0),
        h("Hidden 2", [[1]], 0),
        h("Hidden 3", [[3,0,2,0,4]], 7),
        h("Hidden 4", [[1,0,2,1,0,1,3]], 5),
        h("Hidden 5", [[2,0,2]], 2),
    ],
},

# ── 23. Minimum Window Substring ──────────────────────────────────────────────
{
    "slug":  "minimum-window-substring",
    "py_fn": "min_window",
    "js_fn": "minWindow",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", ["ADOBECODEBANC", "ABC"], "BANC"),
        tc("Test 2", ["a",             "a"],   "a"),
        tc("Test 3", ["a",             "aa"],  ""),
    ],
    "hidden": [
        h("Hidden 1", ["aa",         "aa"],  "aa"),
        h("Hidden 2", ["bba",        "ab"],  "ba"),
        h("Hidden 3", ["AAABBBCCC",  "BC"],  "BC"),
        h("Hidden 4", ["abc",        "b"],   "b"),
        h("Hidden 5", ["a",          "b"],   ""),
    ],
},

# ── 24. N-Queens ──────────────────────────────────────────────────────────────
{
    "slug":  "n-queens",
    "py_fn": "solve_n_queens",
    "js_fn": "solveNQueens",
    "cmp":   "sorted_str_list",
    "tests": [
        tc("Test 1", [4], [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]),
        tc("Test 2", [1], [["Q"]]),
    ],
    "hidden": [
        h("Hidden 1", [1], [["Q"]]),
        h("Hidden 2", [2], []),
        h("Hidden 3", [3], []),
        h("Hidden 4", [4], [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]),
        h("Hidden 5", [5], [
            ["Q....","..Q..","....Q",".Q...","...Q."],
            ["Q....","...Q.",".Q...","....Q","..Q.."],
            [".Q...","...Q.","Q....","..Q..","....Q"],
            [".Q...","....Q","..Q..","Q....","...Q."],
            ["..Q..","Q....","...Q.",".Q...","....Q"],
            ["..Q..","....Q",".Q...","...Q.","Q...."],
            ["...Q.","Q....","..Q..","....Q",".Q..."],
            ["...Q.",".Q...","....Q","..Q..","Q...."],
            ["....Q",".Q...","...Q.","Q....","..Q.."],
            ["....Q","..Q..","Q....","...Q.",".Q..."],
        ]),
    ],
},

# ── 25. Sliding Window Maximum ────────────────────────────────────────────────
{
    "slug":  "sliding-window-maximum",
    "py_fn": "max_sliding_window",
    "js_fn": "maxSlidingWindow",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [[1,3,-1,-3,5,3,6,7], 3], [3,3,5,5,6,7]),
        tc("Test 2", [[1], 1],                  [1]),
        tc("Test 3", [[9,11], 2],               [11]),
    ],
    "hidden": [
        h("Hidden 1", [[4,-2,3,5,1,2], 3],  [4,5,5,5]),
        h("Hidden 2", [[1,2,3,4,5], 2],     [2,3,4,5]),
        h("Hidden 3", [[5,4,3,2,1], 3],     [5,4,3]),
        h("Hidden 4", [[1,-1], 1],          [1,-1]),
        h("Hidden 5", [[7,2,4], 2],         [7,4]),
    ],
},

# ── 26. Regular Expression Matching ──────────────────────────────────────────
{
    "slug":  "regular-expression-matching",
    "py_fn": "is_match",
    "js_fn": "isMatch",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", ["aa",  "a"],   False),
        tc("Test 2", ["aa",  "a*"],  True),
        tc("Test 3", ["ab",  ".*"],  True),
    ],
    "hidden": [
        h("Hidden 1", ["aab",          "c*a*b"],    True),
        h("Hidden 2", ["mississippi",  "mis*is*p*."],False),
        h("Hidden 3", ["a",            ".*"],        True),
        h("Hidden 4", ["",             ".*"],        True),
        h("Hidden 5", ["a",            "a."],        False),
    ],
},

# ── 27. Largest Rectangle in Histogram ───────────────────────────────────────
{
    "slug":  "largest-rectangle-in-histogram",
    "py_fn": "largest_rectangle_area",
    "js_fn": "largestRectangleArea",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", [[2,1,5,6,2,3]], 10),
        tc("Test 2", [[2,4]],         4),
        tc("Test 3", [[1]],           1),
    ],
    "hidden": [
        h("Hidden 1", [[6,2,5,4,5,1,6]], 12),
        h("Hidden 2", [[1,2,3,4,5]],      9),
        h("Hidden 3", [[5,4,3,2,1]],      9),
        h("Hidden 4", [[2,2,2,2]],        8),
        h("Hidden 5", [[0,1,0]],          1),
    ],
},

# ── 28. Word Break II ─────────────────────────────────────────────────────────
{
    "slug":  "word-break-ii",
    "py_fn": "word_break",
    "js_fn": "wordBreak",
    "cmp":   "sorted_str_list",
    "tests": [
        tc("Test 1", ["catsanddog",       ["cat","cats","and","sand","dog"]],
                     ["cat sand dog","cats and dog"]),
        tc("Test 2", ["pineapplepenapple",["apple","pen","applepen","pine","pineapple"]],
                     ["pine apple pen apple","pine applepen apple","pineapple pen apple"]),
        tc("Test 3", ["catsandog",        ["cats","dog","sand","and","cat"]], []),
    ],
    "hidden": [
        h("Hidden 1", ["a",           ["a"]],             ["a"]),
        h("Hidden 2", ["leetcode",    ["leet","code"]],   ["leet code"]),
        h("Hidden 3", ["applepenapple",["apple","pen"]],  ["apple pen apple"]),
        h("Hidden 4", ["catsanddog",  ["cat","sand","dog"]], ["cat sand dog"]),
        h("Hidden 5", ["aaaa",        ["a","aa","aaa"]],
                       ["a a a a","a a aa","a aa a","a aaa","aa a a","aa aa","aaa a"]),
    ],
},

# ── 29. Merge k Sorted Lists ──────────────────────────────────────────────────
{
    "slug":  "merge-k-sorted-lists",
    "py_fn": "merge_k_lists",
    "js_fn": "mergeKLists",
    "cmp":   "linked_list",
    "tests": [
        tc("Test 1", [[[1,4,5],[1,3,4],[2,6]]], [1,1,2,3,4,4,5,6]),
        tc("Test 2", [[[]]],                     []),
        tc("Test 3", [[[1]]],                    [1]),
    ],
    "hidden": [
        h("Hidden 1", [[]],                              []),
        h("Hidden 2", [[[1,2],[3,4]]],                   [1,2,3,4]),
        h("Hidden 3", [[[5],[3,7],[1,4,6]]],             [1,3,4,5,6,7]),
        h("Hidden 4", [[[1,1],[1,1]]],                   [1,1,1,1]),
        h("Hidden 5", [[[2,6],[5,7],[1,3,4]]],           [1,2,3,4,5,6,7]),
    ],
},

# ── 30. Edit Distance ─────────────────────────────────────────────────────────
{
    "slug":  "edit-distance",
    "py_fn": "min_distance",
    "js_fn": "minDistance",
    "cmp":   "exact",
    "tests": [
        tc("Test 1", ["horse",     "ros"],       3),
        tc("Test 2", ["intention", "execution"], 5),
        tc("Test 3", ["",          "abc"],       3),
    ],
    "hidden": [
        h("Hidden 1", ["a",     "b"],      1),
        h("Hidden 2", ["abc",   "abc"],    0),
        h("Hidden 3", ["abc",   "abcd"],   1),
        h("Hidden 4", ["abcde", "vwxyz"],  5),
        h("Hidden 5", ["kitten","sitting"],3),
    ],
},

]  # end JUDGE


def run():
    updated = 0
    not_found = []
    for entry in JUDGE:
        slug = entry["slug"]
        judge_data = {k: v for k, v in entry.items() if k != "slug"}
        result = questions_col.update_one(
            {"slug": slug},
            {"$set": {"judge": judge_data}},
        )
        if result.matched_count == 0:
            not_found.append(slug)
        else:
            updated += 1
            print(f"  ✓ {slug}")

    print(f"\nUpdated {updated}/30 questions.")
    if not_found:
        print(f"NOT FOUND: {not_found}")


if __name__ == "__main__":
    print("Adding judge data to MongoDB questions…\n")
    run()
