// SonarComplexity — Example File
// Open this file in VS Code to see inline complexity indicators to the right of each function.

// ✔ Good — score < 10
function greet(name) {
  if (name) {
    return `Hello, ${name}!`;
  }
  return 'Hello!';
}

// ⚠ Warning — score 10–15 (approaching SonarQube limit)
function parseConfig(input, strict, fallback) {
  if (!input) {
    if (fallback) {
      return fallback;
    } else {
      return null;
    }
  }
  if (typeof input === 'string') {
    if (strict) {
      if (input.startsWith('{')) {
        try {
          return JSON.parse(input);
        } catch (e) {
          if (fallback) {
            return fallback;
          }
          return null;
        }
      } else {
        return null;
      }
    } else {
      return input;
    }
  }
  if (typeof input === 'object') {
    return input;
  }
  return fallback || null;
}

// ✖ Error — score 16+ (SonarQube S3776 violation)
function processOrder(order, user, inventory, discounts) {
  if (!order || !user) {
    return { error: 'Missing order or user' };
  }
  if (!inventory) {
    return { error: 'No inventory' };
  }

  let total = 0;
  for (const item of order.items) {
    if (!item.id) {
      continue;
    }
    const stock = inventory[item.id];
    if (!stock) {
      return { error: `Item ${item.id} not found` };
    }
    if (stock.quantity < item.quantity) {
      if (stock.allowBackorder) {
        item.backordered = true;
      } else {
        return { error: `Insufficient stock for ${item.id}` };
      }
    }
    let price = stock.price * item.quantity;
    if (discounts) {
      if (discounts.bulk && item.quantity > 10) {
        price *= 0.9;
      }
      if (discounts.member && user.isMember) {
        price *= 0.95;
      }
      if (discounts.promo && discounts.promo.itemId === item.id) {
        price -= discounts.promo.amount;
        if (price < 0) {
          price = 0;
        }
      }
    }
    total += price;
  }

  if (user.creditLimit && total > user.creditLimit) {
    if (user.canExceedLimit) {
      order.flagged = true;
    } else {
      return { error: 'Exceeds credit limit' };
    }
  }

  return { total, order };
}
