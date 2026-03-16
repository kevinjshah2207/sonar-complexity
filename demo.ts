// === DEMO FILE: Open this in VS Code to see SonarComplexity in action ===

// GREEN — Complexity: 0 [Good]
function simple(x: number): number {
  return x * 2;
}

// GREEN — Complexity: 3 [Good]
function moderate(items: string[]): string[] {
  const result: string[] = [];
  for (const item of items) {
    if (item.length > 0) {
      result.push(item.trim());
    }
  }
  return result;
}

// YELLOW (Warning) — Complexity: 16
function getDiscount(
  user: { tier: string; years: number },
  cart: { total: number; items: number },
  promoCode: string | null,
): number {
  let discount = 0;

  if (user.tier === "gold" || user.tier === "platinum") {
    if (user.years > 5) {
      discount += 15;
    } else if (user.years > 2) {
      discount += 10;
    } else {
      discount += 5;
    }
  } else if (user.tier === "silver") {
    if (user.years > 3) {
      discount += 8;
    }
  }

  if (cart.total > 100) {
    if (cart.items > 5) {
      discount += 10;
    } else {
      discount += 5;
    }
  }

  if (promoCode) {
    if (promoCode === "SAVE20") {
      discount += 20;
    } else if (promoCode === "SAVE10") {
      discount += 10;
    }
  }

  return Math.min(discount, 50);
}

// RED (Error) — Complexity: 58 — this function desperately needs refactoring!
function processOrder(
  order: any,
  inventory: Map<string, number>,
  rules: any[],
): { success: boolean; errors: string[] } {
  const errors: string[] = [];

  if (order && order.items) {
    for (const item of order.items) {
      if (item.quantity > 0) {
        const stock = inventory.get(item.id);
        if (stock !== undefined) {
          if (stock >= item.quantity) {
            for (const rule of rules) {
              if (rule.type === "limit") {
                if (item.quantity > rule.max) {
                  errors.push(`${item.id}: exceeds limit`);
                }
              } else if (rule.type === "bundle") {
                if (rule.requires && !order.items.find((i: any) => i.id === rule.requires)) {
                  errors.push(`${item.id}: missing bundle item`);
                }
              } else if (rule.type === "restricted") {
                if (order.region === "blocked") {
                  errors.push(`${item.id}: restricted in region`);
                }
              }
            }
          } else {
            errors.push(`${item.id}: out of stock`);
          }
        } else {
          errors.push(`${item.id}: not found`);
        }
      } else {
        errors.push(`${item.id}: invalid quantity`);
      }
    }
  } else {
    errors.push("Invalid order");
  }

  return { success: errors.length === 0, errors };
}
