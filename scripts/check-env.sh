#!/bin/bash

# check-env.sh - Security audit script for CV Bucket

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting CV Bucket security audit...${NC}\n"

# 1. Check for tracked .env files
echo -en "1. Checking for tracked .env files... "
TRACKED_ENV=$(git ls-files .env .env.server .env.local 2>/dev/null)
if [ -n "$TRACKED_ENV" ]; then
    echo -e "${RED}FAILED${NC}"
    echo -e "${RED}WARNING: The following .env files are being tracked by Git:${NC}"
    echo "$TRACKED_ENV"
    echo -e "${YELLOW}Run 'git rm --cached <file>' to stop tracking them while keeping local copies.${NC}"
else
    echo -e "${GREEN}PASSED${NC}"
fi

# 2. Check for common secret patterns in source code
echo -en "2. Auditing source code for hardcoded secrets... "
# Simple patterns for API keys, passwords, etc.
SECRET_PATTERNS="(apiKey|secret|password|token|accessKey)\s*[:=]\s*[\"'][^\"']+[\"']"
GREP_RESULTS=$(grep -rEi "$SECRET_PATTERNS" src server --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null | grep -v "example")

if [ -n "$GREP_RESULTS" ]; then
    echo -e "${RED}FAILED${NC}"
    echo -e "${RED}WARNING: Potential secrets found in source files:${NC}"
    echo "$GREP_RESULTS"
else
    echo -e "${GREEN}PASSED${NC}"
fi

# 3. Verify .env.example files match .env requirements
echo -en "3. Verifying .env templates completeness... "
# (This is a simplified check, checking if keys in .env.server exist in .env.server.example)
if [ -f ".env.server" ] && [ -f ".env.server.example" ]; then
    MISSING_KEYS=""
    while IFS== read -r key value; do
        [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
        if ! grep -q "^$key=" ".env.server.example"; then
            MISSING_KEYS="$MISSING_KEYS $key"
        fi
    done < ".env.server"
    
    if [ -n "$MISSING_KEYS" ]; then
        echo -e "${YELLOW}WARNING${NC}"
        echo -e "${YELLOW}The following keys are in .env.server but missing from .env.server.example:${NC}"
        echo "$MISSING_KEYS"
    else
        echo -e "${GREEN}PASSED${NC}"
    fi
else
    echo -e "${NC}SKIPPED (File missing)${NC}"
fi

echo -e "\n${GREEN}Security audit complete.${NC}"
