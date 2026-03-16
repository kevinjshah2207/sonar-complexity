// Expected complexity: 9
function deeplyNested(a, b, c) {
  if (a) {                   // +1 (nesting=0)
    for (let i = 0; i < b; i++) {  // +2 (nesting=1)
      if (i % 2 === 0) {    // +3 (nesting=2)
        // do something
      } else {               // +1 (else)
        // do other
      }
    }
  } else if (b) {            // +1 (else if)
    while (b > 0) {          // +2 (nesting=1)
      b--;
    }
  }
}
// Total: 1 + 2 + 3 + 1 + 1 + 2 = 10
// Wait, let me recalculate:
// if (a)           -> +1 (structural, nesting=0)
// for (...)        -> +2 (structural, nesting=1)
// if (i % 2)       -> +3 (structural, nesting=2)
// else             -> +1 (fundamental)
// else if (b)      -> +1 (fundamental, no nesting)
// while (b > 0)    -> +2 (structural, nesting=1)
// Total = 1 + 2 + 3 + 1 + 1 + 2 = 10

// Expected complexity: 6
function tryCatch(data) {
  try {
    if (data) {              // +1 (nesting=0)
      for (const item of data) {  // +2 (nesting=1)
        process(item);
      }
    }
  } catch (e) {              // +1 (nesting=0)
    if (e instanceof Error) { // +2 (nesting=1)
      throw e;
    }
  }
}
// Total: 1 + 2 + 1 + 2 = 6
