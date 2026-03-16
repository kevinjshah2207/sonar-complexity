// Expected complexity: 0
function empty() {
  return 42;
}

// Expected complexity: 1
function singleIf(a) {
  if (a) {       // +1
    return true;
  }
  return false;
}

// Expected complexity: 4
function ifElseIfElse(a, b) {
  if (a) {          // +1
    return 1;
  } else if (b) {   // +1
    return 2;
  } else {           // +1
    return 3;
  }
}

// Expected complexity: 3
function simpleLoop(arr) {
  for (let i = 0; i < arr.length; i++) {  // +1
    if (arr[i] > 0) {                      // +2 (nesting=1)
      continue;
    }
  }
}

// Expected complexity: 1
function booleanAnd(a, b) {
  return a && b;  // +1 (&&)
}

// Expected complexity: 2
function mixedBooleans(a, b, c) {
  return a && b || c;  // +1 (&&) +1 (||)
}

// Expected complexity: 1
function sameBooleans(a, b, c) {
  return a && b && c;  // +1 (&&) - same operator, only counted once
}
