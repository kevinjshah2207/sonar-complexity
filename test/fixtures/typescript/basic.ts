// Expected complexity: 3
function typedFunction(items: string[]): number {
  let count = 0;
  for (const item of items) {  // +1
    if (item.length > 0) {      // +2 (nesting=1)
      count++;
    }
  }
  return count;
}

// Expected complexity: 1
const arrowTyped = (x: number): boolean => {
  if (x > 0) {  // +1
    return true;
  }
  return false;
};

// Interface — no complexity (not a function)
interface MyInterface {
  name: string;
  getValue(): number;
}
