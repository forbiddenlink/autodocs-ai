import json

with open('feature_list.json', 'r') as f:
    features = json.load(f)

# Criteria:
# 1. passes: false
# 2. dependencies are already passing (or no dependencies)
# 3. NOT database-dependent
# 4. simple or medium complexity
# 5. UI, navigation, or frontend functionality

# First, let's identify which tests are passing
passing_tests = set()
for i, feature in enumerate(features):
    if feature.get('passes', False):
        passing_tests.add(i + 1)

print("=== PASSING TESTS ===")
print(sorted(passing_tests))
print()

# Now find eligible features
candidates = []

for i, feature in enumerate(features):
    test_num = i + 1

    # Filter 1: passes must be false
    if feature.get('passes', True):
        continue

    # Filter 3: Not database-dependent
    description = feature.get('description', '').lower()
    if 'database' in description or 'postgresql' in description:
        continue

    # Filter 4: Simple or medium complexity
    if feature.get('complexity') not in ['simple', 'medium']:
        continue

    # Filter 2: Check dependencies
    deps = feature.get('dependencies', [])
    if deps:
        # All dependencies must be in passing_tests
        if not all(dep in passing_tests for dep in deps):
            continue

    # Filter 5: UI, navigation, or frontend
    description_lower = description
    frontend_keywords = ['ui', 'page', 'navigate', 'button', 'display', 'viewer', 'interface',
                        'layout', 'design', 'responsive', 'dark mode', 'logout', 'settings',
                        'loading', 'error', 'form', 'input', 'modal', 'dialog']
    if not any(keyword in description_lower for keyword in frontend_keywords):
        continue

    candidates.append({
        'test_num': test_num,
        'description': feature.get('description', ''),
        'complexity': feature.get('complexity', ''),
        'dependencies': deps,
        'category': feature.get('category', '')
    })

# Sort by complexity (simple first) and then by test number
candidates.sort(key=lambda x: (x['complexity'] == 'medium', x['test_num']))

print("=== ELIGIBLE FEATURES (passes=false, simple/medium, no DB, dependencies met) ===")
print()

for i, cand in enumerate(candidates[:10], 1):
    print(f"{i}. TEST {cand['test_num']}: {cand['description']}")
    print(f"   Complexity: {cand['complexity']}")
    print(f"   Category: {cand['category']}")
    print(f"   Dependencies: {cand['dependencies'] if cand['dependencies'] else 'None'}")
    print()
