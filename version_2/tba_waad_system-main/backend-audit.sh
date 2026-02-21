#!/bin/bash

# TBA Backend API Audit Script
# Tests all endpoints for HTTP 500 errors

TOKEN="eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiJzdXBlcmFkbWluIiwidXNlcklkIjoxLCJmdWxsTmFtZSI6IlN5c3RlbSBTdXBlciBBZG1pbmlzdHJhdG9yIiwiZW1haWwiOiJzdXBlcmFkbWluQHRiYS5zYSIsInJvbGVzIjpbIlNVUEVSX0FETUlOIl0sInBlcm1pc3Npb25zIjpbIk1BTkFHRV9DT01QQU5JRVMiLCJNQU5BR0VfUkJBQyIsIk1BTkFHRV9JTlNVUkFOQ0UiLCJBUFBST1ZFX0NMQUlNUyIsIk1BTkFHRV9SRVZJRVdFUiIsIlZJRVdfSU5TVVJBTkNFIiwiVklFV19SRVZJRVdFUiIsIlZJRVdfRU1QTE9ZRVJTIiwiQ1JFQVRFX0NMQUlNIiwiVklFV19DT01QQU5JRVMiLCJNQU5BR0VfUFJPVklERVJTIiwiTUFOQUdFX1JFUE9SVFMiLCJNQU5BR0VfRU1QTE9ZRVJTIiwiVklFV19WSVNJVFMiLCJSRUpFQ1RfQ0xBSU1TIiwiTUFOQUdFX1NZU1RFTV9TRVRUSU5HUyIsIk1BTkFHRV9WSVNJVFMiLCJWSUVXX1BSRUFVVEgiLCJVUERBVEVfQ0xBSU0iLCJWSUVXX0NMQUlNUyIsIlZJRVdfQkFTSUNfREFUQSIsIk1BTkFHRV9QUkVBVVRIIiwiTUFOQUdFX01FTUJFUlMiLCJWSUVXX01FTUJFUlMiLCJWSUVXX1JFUE9SVFMiLCJNQU5BR0VfQ0xBSU1TIiwiVklFV19QUk9WSURFUlMiLCJWSUVXX0NMQUlNX1NUQVRVUyJdLCJpYXQiOjE3NjYyNjAxNjcsImV4cCI6MTc2NjM0NjU2N30.3lVuzCJDyH9b2wPP-kYHTpG8Sv7siNa8A9EPnOSc5MhAxkV_tCc0jKNzk0CAebf1"

BASE_URL="http://localhost:8080"

echo "=========================================="
echo "    TBA BACKEND API AUDIT - 500 ERRORS"
echo "=========================================="
echo ""

# Counter for issues
ERRORS_500=0
ERRORS_OTHER=0
SUCCESS=0

test_endpoint() {
  local endpoint=$1
  local desc=$2
  
  response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${endpoint}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" 2>/dev/null)
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "500" ]; then
    echo "❌ 500 ERROR: $desc - GET $endpoint"
    error_msg=$(echo "$body" | jq -r '.message // "Unknown"' 2>/dev/null)
    echo "   Error: $error_msg"
    echo ""
    ((ERRORS_500++))
  elif [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo "✅ $desc - HTTP $http_code"
    ((SUCCESS++))
  elif [ "$http_code" = "404" ]; then
    echo "⚠️  NOT FOUND: $desc - HTTP 404"
    ((ERRORS_OTHER++))
  else
    echo "⚠️  $desc - HTTP $http_code"
    ((ERRORS_OTHER++))
  fi
}

echo "🔍 Testing Core API Endpoints..."
echo ""

# Companies/Organizations
test_endpoint "/api/companies" "List Companies"
test_endpoint "/api/companies/1" "Get Company by ID"

# Employers
test_endpoint "/api/employers" "List Employers"
test_endpoint "/api/employers/1" "Get Employer by ID"

# Providers
test_endpoint "/api/providers" "List Providers"
test_endpoint "/api/providers/1" "Get Provider by ID"

# Members
test_endpoint "/api/members" "List Members"
test_endpoint "/api/members/1" "Get Member by ID"

# Insurance Companies
test_endpoint "/api/insurance-companies" "List Insurance Companies"
test_endpoint "/api/insurance-companies/1" "Get Insurance Company by ID"

# Insurance Policies
test_endpoint "/api/insurance-policies" "List Insurance Policies"
test_endpoint "/api/insurance-policies/1" "Get Insurance Policy by ID"

# Policies
test_endpoint "/api/policies" "List Policies"
test_endpoint "/api/policies/1" "Get Policy by ID"

# Claims
test_endpoint "/api/claims" "List Claims"
test_endpoint "/api/claims/1" "Get Claim by ID"

# Visits
test_endpoint "/api/visits" "List Visits"
test_endpoint "/api/visits/1" "Get Visit by ID"

# Pre-Approvals
test_endpoint "/api/pre-approvals" "List Pre-Approvals"
test_endpoint "/api/pre-approvals/1" "Get Pre-Approval by ID"

# Pre-Authorizations
test_endpoint "/api/pre-authorizations" "List Pre-Authorizations"
test_endpoint "/api/pre-authorizations/1" "Get Pre-Authorization by ID"

# Benefit Packages
test_endpoint "/api/benefit-packages" "List Benefit Packages"
test_endpoint "/api/benefit-packages/1" "Get Benefit Package by ID"

# Medical Categories
test_endpoint "/api/medical-categories" "List Medical Categories"
test_endpoint "/api/medical-categories/1" "Get Medical Category by ID"

# Medical Services
test_endpoint "/api/medical-services" "List Medical Services"
test_endpoint "/api/medical-services/1" "Get Medical Service by ID"

# Medical Packages
test_endpoint "/api/medical-packages" "List Medical Packages"
test_endpoint "/api/medical-packages/1" "Get Medical Package by ID"

# Reviewer Companies
test_endpoint "/api/reviewer-companies" "List Reviewer Companies"
test_endpoint "/api/reviewer-companies/1" "Get Reviewer Company by ID"

# Provider Contracts
test_endpoint "/api/provider-contracts" "List Provider Contracts"
test_endpoint "/api/provider-contracts/1" "Get Provider Contract by ID"

echo ""
echo "🔍 Testing Admin Endpoints..."
echo ""

# Audit Logs
test_endpoint "/api/admin/audit" "List Audit Logs"
test_endpoint "/api/admin/audit/1" "Get Audit Log by ID"

# Users
test_endpoint "/api/admin/users" "List Users"
test_endpoint "/api/admin/users/1" "Get User by ID"

# Roles
test_endpoint "/api/admin/roles" "List Roles"
test_endpoint "/api/admin/roles/1" "Get Role by ID"

# Permissions
test_endpoint "/api/admin/permissions" "List Permissions"

# Module Access
test_endpoint "/api/admin/modules" "List Module Access"

# Feature Flags
test_endpoint "/api/admin/features" "List Feature Flags"

echo ""
echo "🔍 Testing Dashboard..."
echo ""

# Dashboard
test_endpoint "/api/dashboard/stats" "Dashboard Stats"
test_endpoint "/api/dashboard/summary" "Dashboard Summary"

echo ""
echo "=========================================="
echo "    AUDIT SUMMARY"
echo "=========================================="
echo "✅ Successful: $SUCCESS"
echo "❌ 500 Errors: $ERRORS_500"
echo "⚠️  Other Issues: $ERRORS_OTHER"
echo "=========================================="
