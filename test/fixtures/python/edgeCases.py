# Long elif chain
# Expected complexity: 5 (1 for if + 4 for each elif)
def long_elif(a, b, c, d, e):
    if a:
        return 1
    elif b:
        return 2
    elif c:
        return 3
    elif d:
        return 4
    elif e:
        return 5

# Nested functions — each independent
# Expected complexity for outer_func: 1
# Expected complexity for inner_func: 1
def outer_func(a):
    if a:  # +1
        def inner_func(b):
            if b:  # +1 (nesting=0, own function)
                return b

# Deeply nested with elif
# Expected complexity: 14
def complex_func(a, b, c, d):
    if a:                   # +1 (nesting=0)
        for i in range(b):  # +2 (nesting=1)
            if i > 0:       # +3 (nesting=2)
                pass
            elif i < 0:     # +1 (elif)
                pass
            else:           # +1 (else)
                pass
    elif c:                 # +1 (elif)
        while d:            # +2 (nesting=1)
            d -= 1
    else:                   # +1 (else)
        try:
            pass
        except:             # +1 (nesting=1)
            pass

# Mixed boolean
# Expected complexity: 3
def mixed_bool(a, b, c, d, e, f):
    return a and b and c or d or e and f
