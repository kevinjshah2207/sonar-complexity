# Expected complexity: 10
def deeply_nested(a, b, c):
    if a:                   # +1 (nesting=0)
        for i in range(b):  # +2 (nesting=1)
            if i % 2 == 0:  # +3 (nesting=2)
                pass
            else:           # +1 (else)
                pass
    elif b:                 # +1 (elif)
        while b > 0:        # +2 (nesting=1)
            b -= 1

# Expected complexity: 6
def try_except(data):
    try:
        if data:                    # +1 (nesting=0)
            for item in data:       # +2 (nesting=1)
                process(item)
    except Exception as e:          # +1 (nesting=0)
        if isinstance(e, ValueError):  # +2 (nesting=1)
            raise
