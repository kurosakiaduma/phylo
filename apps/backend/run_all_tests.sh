#!/bin/bash

# Family Tree Backend - Comprehensive Test Runner
# Runs all test suites with coverage reporting

set -e

echo "🧪 Family Tree Backend - Test Suite"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}❌ pytest not found. Installing...${NC}"
    pip install pytest pytest-cov httpx -q
    echo -e "${GREEN}✅ pytest installed${NC}"
fi

# Create reports directory
mkdir -p test-reports

echo -e "${BLUE}📊 Running all tests with coverage...${NC}"
echo ""

# Run all tests with coverage
pytest tests/ -v \
    --cov=. \
    --cov-report=html:test-reports/coverage-html \
    --cov-report=term-missing \
    --cov-report=json:test-reports/coverage.json \
    --junit-xml=test-reports/junit.xml \
    --color=yes

TEST_EXIT_CODE=$?

echo ""
echo "====================================="

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo -e "${BLUE}📈 Coverage Report:${NC}"
    echo "   HTML: test-reports/coverage-html/index.html"
    echo "   JSON: test-reports/coverage.json"
    echo "   JUnit: test-reports/junit.xml"
    echo ""
    echo -e "${YELLOW}💡 Open coverage report:${NC}"
    echo "   xdg-open test-reports/coverage-html/index.html"
else
    echo -e "${RED}❌ Some tests failed!${NC}"
    echo ""
    echo "Review the output above for details."
    exit 1
fi

echo ""
echo "====================================="
echo -e "${GREEN}🎉 Test suite complete!${NC}"
