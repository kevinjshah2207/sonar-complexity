// Arrow function assigned to const
// Expected complexity: 1
const arrowSimple = (x) => {
  if (x) {  // +1
    return x;
  }
};

// Arrow function with expression body — no control flow
// Expected complexity: 0
const arrowExpr = (x) => x + 1;

// Nested functions — each analyzed independently
// Expected complexity for outer: 1
// Expected complexity for inner: 1
function outer(a) {
  if (a) {  // +1
    function inner(b) {
      if (b) {  // +1 (nesting=0, because inner is its own function)
        return b;
      }
    }
  }
}

// Switch statement
// Expected complexity: 1 (switch gets ONE +1, not per-case)
function switchExample(x) {
  switch (x) {  // +1
    case 1:
      return 'one';
    case 2:
      return 'two';
    default:
      return 'other';
  }
}

// Nested switch inside if
// Expected complexity: 3
function nestedSwitch(a, x) {
  if (a) {         // +1 (nesting=0)
    switch (x) {   // +2 (nesting=1)
      case 1:
        return 'one';
    }
  }
}

// Long else-if chain
// Expected complexity: 5 (1 for if + 4 for each else-if, no nesting penalty)
function longElseIf(a, b, c, d, e) {
  if (a) {
    return 1;
  } else if (b) {
    return 2;
  } else if (c) {
    return 3;
  } else if (d) {
    return 4;
  } else if (e) {
    return 5;
  }
}

// Mixed boolean operators: a && b && c || d || e && f
// Expected complexity: 3 (+1 for &&, +1 for ||, +1 for &&)
function mixedBoolSeq(a, b, c, d, e, f) {
  return a && b && c || d || e && f;
}

// Labeled break
// Expected complexity: 2 (1 for outer loop + 1 for labeled break)
function labeledBreak(arr) {
  outer:
  for (const item of arr) {  // +1
    break outer;              // +1 (labeled)
  }
}

// Ternary inside if
// Expected complexity: 3
function ternaryNested(a, b) {
  if (a) {           // +1 (nesting=0)
    return b ? 1 : 0; // +2 (nesting=1)
  }
}

// Class method
// Expected complexity: 1
class MyClass {
  myMethod(a) {
    if (a) {  // +1
      return a;
    }
  }
}

// do-while
// Expected complexity: 1
function doWhile(x) {
  do {  // +1
    x--;
  } while (x > 0);
}
