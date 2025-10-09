#!/usr/bin/env fish

# Family Tree Backend - Comprehensive Test Runner (Fish Shell)
# Runs all test suites with coverage reporting

set -e

echo "🧪 Family Tree Backend - Test Suite"
echo "====================================="
echo ""

# Colors for output
set GREEN '\033[0;32m'
set BLUE '\033[0;34m'
set YELLOW '\033[1;33m'
set RED '\033[0;31m'
set NC '\033[0m' # No Color

# Check if pytest is installed
if not command -v pytest &> /dev/null
    echo -e "$RED❌ pytest not found. Installing...$NC"
    pip install pytest pytest-cov httpx -q
    echo -e "$GREEN✅ pytest installed$NC"
end

# Create reports directory
mkdir -p test-reports

echo -e "$BLUE📊 Running all tests with coverage...$NC"
echo ""

# Run all tests with coverage
pytest tests/ -v \
    --cov=. \
    --cov-report=html:test-reports/coverage-html \
    --cov-report=term-missing \
    --cov-report=json:test-reports/coverage.json \
    --junit-xml=test-reports/junit.xml \
    --color=yes

set TEST_EXIT_CODE $status

echo ""
echo "====================================="

if test $TEST_EXIT_CODE -eq 0
    echo -e "$GREEN✅ All tests passed!$NC"
    echo ""
    echo -e "$BLUE📈 Coverage Report:$NC"
    echo "   HTML: test-reports/coverage-html/index.html"
    echo "   JSON: test-reports/coverage.json"
    echo "   JUnit: test-reports/junit.xml"
    echo ""
    echo -e "$YELLOW💡 Open coverage report:$NC"
    echo "   xdg-open test-reports/coverage-html/index.html"
else
    echo -e "$RED❌ Some tests failed!$NC"
    echo ""
    echo "Review the output above for details."
    exit 1
end

echo ""
echo "====================================="
echo -e "$GREEN🎉 Test suite complete!$NC"
