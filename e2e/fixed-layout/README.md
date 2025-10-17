# FixedLayout E2E Testing Project

> This project contains end-to-end (E2E) tests for demo-fixed-layout to ensure core workflows are stable and reliable.

---

## 📦 Project Structure

e2e/
├─ tests/           # Test cases
│ ├─ layout.spec.js
│ ├─ node.spec.js
│ └─ ...
├─ test-results/    # Store Test Results
├─ utils/           # Some utils


---

## 🚀 How to Run

```bash

# Install dependencies
rush update

# Run all tests
cd e2e/fixed-layout & npm run e2e:test

# Update ScreenShots
cd e2e/fixed-layout & npm run e2e:update-screenshot

```
