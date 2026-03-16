# Expected complexity: 0
def empty():
    return 42

# Expected complexity: 1
def single_if(a):
    if a:       # +1
        return True
    return False

# Expected complexity: 3
def if_elif_else(a, b):
    if a:           # +1
        return 1
    elif b:         # +1
        return 2
    else:           # +1
        return 3

# Expected complexity: 3
def simple_loop(arr):
    for item in arr:        # +1
        if item > 0:        # +2 (nesting=1)
            continue

# Expected complexity: 1
def boolean_and(a, b):
    return a and b  # +1 (and)

# Expected complexity: 2
def mixed_booleans(a, b, c):
    return a and b or c  # +1 (and) +1 (or)
