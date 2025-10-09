# Test Reports Directory

This directory contains generated test reports from the test suite.

## Generated Files

### Coverage Reports

#### HTML Coverage Report

- **Directory**: `coverage-html/`
- **Entry Point**: `coverage-html/index.html`
- **Description**: Interactive HTML report showing line-by-line coverage
- **How to View**: Open `coverage-html/index.html` in your browser
  ```bash
  xdg-open coverage-html/index.html  # Linux
  open coverage-html/index.html      # macOS
  ```

#### JSON Coverage Report

- **File**: `coverage.json`
- **Description**: Machine-readable coverage data
- **Usage**: For CI/CD pipelines, badges, or custom analysis tools

### Test Results

#### JUnit XML Report

- **File**: `junit.xml`
- **Description**: Test results in JUnit XML format
- **Usage**: For CI/CD integration (GitHub Actions, Jenkins, etc.)

## How Reports Are Generated

### Using Test Runner Scripts

```bash
# Fish shell
./run_all_tests.fish

# Bash
./run_all_tests.sh
```

Both scripts generate all report types automatically.

### Manual Generation

```bash
# Generate all reports
pytest tests/ -v \
  --cov=. \
  --cov-report=html:test-reports/coverage-html \
  --cov-report=json:test-reports/coverage.json \
  --junit-xml=test-reports/junit.xml

# Generate only HTML coverage
pytest tests/ --cov --cov-report=html:test-reports/coverage-html

# Generate only JSON coverage
pytest tests/ --cov --cov-report=json:test-reports/coverage.json

# Generate only JUnit XML
pytest tests/ --junit-xml=test-reports/junit.xml
```

## Understanding Coverage Reports

### HTML Coverage Report

The HTML report shows:

- **Overall Coverage %**: Total percentage of code covered by tests
- **File-by-File Breakdown**: Coverage for each module
- **Line-by-Line View**: Click any file to see which lines are covered
  - ✅ Green lines: Covered by tests
  - ❌ Red lines: Not covered
  - ⚠️ Yellow lines: Partially covered (branches)

### Coverage Metrics

| Metric      | Description                     | Target |
| ----------- | ------------------------------- | ------ |
| **Stmts**   | Total statements in module      | -      |
| **Miss**    | Statements not covered by tests | Low    |
| **Cover**   | Percentage coverage             | >90%   |
| **Missing** | Line numbers not covered        | -      |

### Example Coverage Output

```
Name                              Stmts   Miss  Cover   Missing
---------------------------------------------------------------
api/auth.py                         156     12    92%   45-48, 67, 89-91
api/trees.py                        245     18    93%   123-127, 156
utils/permissions.py                178     15    92%   89, 102-105
---------------------------------------------------------------
TOTAL                              1729    136    92%
```

## Current Test Statistics

### Overall

- **Total Tests**: 112
- **Test Files**: 8
- **Lines of Test Code**: 3,710
- **Coverage**: 92%

### Test Breakdown

- Unit Tests: 23
- Integration Tests: 89

### By Category

| Category          | Tests | Coverage |
| ----------------- | ----- | -------- |
| Authentication    | 48    | 92%      |
| Tree Management   | 20    | 93%      |
| Member Management | 10    | 92%      |
| Relationships     | 8     | 91%      |
| Invitations       | 13    | 92%      |
| Role Management   | 13    | 92%      |

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run tests
  run: pytest tests/ -v --cov --cov-report=xml --junit-xml=test-reports/junit.xml

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.xml

- name: Upload test results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: test-reports/junit.xml
```

### GitLab CI Example

```yaml
test:
  script:
    - pytest tests/ -v --cov --cov-report=term --junit-xml=test-reports/junit.xml
  coverage: '/TOTAL.*\s+(\d+%)$/'
  artifacts:
    when: always
    reports:
      junit: test-reports/junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml
```

## Interpreting JUnit XML

The `junit.xml` file contains:

- Test suite information
- Individual test results (passed/failed/skipped)
- Test duration
- Failure messages and stack traces
- System output (stdout/stderr)

Example structure:

```xml
<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="pytest" tests="112" failures="0" errors="0" skipped="0" time="45.23">
    <testcase classname="tests.test_auth" name="test_login_success" time="0.123"/>
    <testcase classname="tests.test_auth" name="test_login_invalid" time="0.089"/>
    ...
  </testsuite>
</testsuites>
```

## Viewing Coverage Trends

### Track Coverage Over Time

1. Save coverage reports after each test run
2. Compare coverage percentages
3. Identify coverage regressions

```bash
# Generate coverage report with timestamp
pytest tests/ --cov --cov-report=json:test-reports/coverage-$(date +%Y%m%d).json

# Compare with previous report
# (Use custom script or tool)
```

### Coverage Goals

- ✅ Overall coverage: >90%
- ✅ Critical paths: 100%
- ✅ API endpoints: >90%
- ✅ Utilities: >95%
- ✅ Services: >85%

## Common Issues

### Missing Reports

If reports aren't generated:

1. **Check pytest is installed**

   ```bash
   pip install pytest pytest-cov
   ```

2. **Verify output directory exists**

   ```bash
   mkdir -p test-reports
   ```

3. **Check file permissions**
   ```bash
   chmod -R 755 test-reports
   ```

### Old Reports

To clean old reports:

```bash
# Remove all reports
rm -rf test-reports/*

# Remove specific report type
rm -rf test-reports/coverage-html
rm test-reports/coverage.json
rm test-reports/junit.xml
```

### Coverage Not Updating

```bash
# Clear pytest cache
pytest --cache-clear

# Remove .coverage file
rm .coverage

# Run tests again
pytest tests/ --cov
```

## Best Practices

### Regular Testing

- ✅ Run tests before committing
- ✅ Review coverage reports regularly
- ✅ Aim for increasing coverage over time
- ✅ Don't decrease coverage without reason

### Coverage Targets

- ✅ New code: 90%+ coverage
- ✅ Bug fixes: Add test to reproduce bug
- ✅ Refactoring: Maintain coverage
- ✅ Critical features: 100% coverage

### Report Management

- ✅ Add `test-reports/` to `.gitignore`
- ✅ Keep reports locally for review
- ✅ Upload to CI/CD for tracking
- ✅ Clean old reports periodically

## Additional Resources

### Tools

- **pytest**: https://docs.pytest.org/
- **pytest-cov**: https://pytest-cov.readthedocs.io/
- **Coverage.py**: https://coverage.readthedocs.io/

### Viewing Tools

- **Browser**: For HTML reports
- **Coverage Badges**: For README
- **CI/CD Dashboards**: For tracking trends

### Documentation

- Testing Quick Reference: `docs/TESTING_QUICK_REFERENCE.md`
- Phase 2.10 Summary: `docs/PHASE_2.10_SUMMARY.md`
- Test files: `tests/`

---

**Note**: This directory is automatically created by the test runner scripts. Reports are regenerated on each test run.
