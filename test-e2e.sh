#!/bin/bash
# GharBhada Phase 1 — end-to-end API test
set -e
API=http://localhost:4000/api
PASS=0; FAIL=0
check() { # name, expected_substring, actual
  if echo "$3" | grep -q "$2"; then PASS=$((PASS+1)); echo "✓ $1"; else FAIL=$((FAIL+1)); echo "✗ $1 — got: $(echo "$3" | head -c 200)"; fi
}

# 1. Register new tenant
R=$(curl -s -X POST $API/auth/register -H 'Content-Type: application/json' -d '{
  "email":"e2e-tenant@test.com","phone":"9860000099","password":"password123",
  "role":"tenant","fullName":"E2E Tenant","address":"Kathmandu","occupation":"job"}')
check "register tenant" '"token"' "$R"

# 2. Duplicate register rejected
R=$(curl -s -X POST $API/auth/register -H 'Content-Type: application/json' -d '{
  "email":"e2e-tenant@test.com","phone":"9860000099","password":"password123",
  "role":"tenant","fullName":"E2E Tenant","address":"Kathmandu"}')
check "duplicate register rejected" 'पहिले नै दर्ता' "$R"

# 3. Invalid phone rejected
R=$(curl -s -X POST $API/auth/register -H 'Content-Type: application/json' -d '{
  "email":"x@test.com","phone":"12345","password":"password123",
  "role":"tenant","fullName":"X Y","address":"KTM"}')
check "invalid phone rejected" 'मोबाइल नम्बर' "$R"

# 4. Login tenant + landlord + admin
TT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"emailOrPhone":"tenant@test.com","password":"password123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
LT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"emailOrPhone":"9841000001","password":"password123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
AT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"emailOrPhone":"admin@gharbhada.com","password":"password123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
[ -n "$TT" ] && [ -n "$LT" ] && [ -n "$AT" ] && { PASS=$((PASS+1)); echo "✓ login all roles (incl. phone login)"; } || { FAIL=$((FAIL+1)); echo "✗ login"; }

# 5. Wrong password rejected
R=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"emailOrPhone":"tenant@test.com","password":"wrong"}')
check "wrong password rejected" 'मिलेन' "$R"

# 6. Property filters
R=$(curl -s "$API/properties?minRent=20000")
check "filter rent 20k+" 'नयाँ बानेश्वर' "$R"
R=$(curl -s "$API/properties?ward=32")
check "filter ward 32" 'कीर्तिपुर' "$R"
R=$(curl -s "$API/properties?amenities=parking,attachedBathroom")
N=$(echo "$R" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["properties"]))')
[ "$N" = "2" ] && { PASS=$((PASS+1)); echo "✓ amenities filter (2 results)"; } || { FAIL=$((FAIL+1)); echo "✗ amenities filter got $N"; }

# 7. Property detail masks landlord phone
R=$(curl -s $API/properties/1)
check "landlord phone masked" 'XXXXX' "$R"

# 8. Landlord creates property — <3 photos rejected
python3 -c "from PIL import Image; [Image.new('RGB',(100,100),(i*40,100,150)).save(f'/tmp/p{i}.png') for i in (1,2,3)]"
R=$(curl -s -X POST $API/properties -H "Authorization: Bearer $LT" \
  -F 'title=Test Room' -F 'wardNumber=5' -F 'tole=Test Tole' -F 'monthlyRent=9000' \
  -F 'advanceAmount=9000' -F 'rentDueDay=5' -F 'availableFrom=2026-09-01' \
  -F 'amenities={"wifi":true}' -F 'declaration=true' \
  -F 'photos=@/tmp/p1.png' -F 'photos=@/tmp/p2.png')
check "min 3 photos enforced" 'कम्तिमा ३' "$R"

# 9. Valid property creation
R=$(curl -s -X POST $API/properties -H "Authorization: Bearer $LT" \
  -F 'title=E2E Test Room' -F 'wardNumber=5' -F 'tole=Test Tole' -F 'monthlyRent=9000' \
  -F 'advanceAmount=9000' -F 'rentDueDay=5' -F 'availableFrom=2026-09-01' \
  -F 'amenities={"wifi":true,"parking":false}' -F 'declaration=true' \
  -F 'photos=@/tmp/p1.png' -F 'photos=@/tmp/p2.png' -F 'photos=@/tmp/p3.png')
check "create property (pending approval)" 'admin approval' "$R"
NEWID=$(echo "$R" | python3 -c 'import sys,json;print(json.load(sys.stdin)["property"]["id"])')

# 10. Rent below 5000 rejected
R=$(curl -s -X POST $API/properties -H "Authorization: Bearer $LT" \
  -F 'title=Cheap' -F 'wardNumber=5' -F 'tole=T' -F 'monthlyRent=3000' \
  -F 'advanceAmount=0' -F 'rentDueDay=5' -F 'availableFrom=2026-09-01' \
  -F 'amenities={}' -F 'declaration=true' \
  -F 'photos=@/tmp/p1.png' -F 'photos=@/tmp/p2.png' -F 'photos=@/tmp/p3.png')
check "rent < 5000 rejected" '५,०००' "$R"

# 11. Unverified property not in public list
R=$(curl -s "$API/properties")
if echo "$R" | grep -q 'E2E Test Room'; then FAIL=$((FAIL+1)); echo "✗ unverified property leaked"; else PASS=$((PASS+1)); echo "✓ unverified property hidden from public"; fi

# 12. Admin approves
R=$(curl -s -X PUT $API/properties/$NEWID/verify -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"approve":true}')
check "admin approves listing" '"isVerified":true' "$R"

# 13. Tenant role cannot create property
R=$(curl -s -X POST $API/properties -H "Authorization: Bearer $TT" -F 'title=x')
check "tenant blocked from listing" 'अनुमति छैन' "$R"

# 14. Booking without citizenship photos rejected
R=$(curl -s -X POST $API/bookings -H "Authorization: Bearer $TT" -F 'propertyId=1' -F 'tenantName=Sita')
check "booking needs citizenship photos" 'नागरिकताको अगाडि' "$R"

# 15. Full booking submission
R=$(curl -s -X POST $API/bookings -H "Authorization: Bearer $TT" \
  -F 'propertyId=1' -F 'tenantName=सीता तामाङ' -F 'tenantPermanentAddress=धादिङ, नीलकण्ठ-४, बागमती' \
  -F 'tenantCitizenshipNumber=30-01-76-04321' -F 'tenantPhone=9861000001' \
  -F 'tenantOccupation=student' -F 'tenantOrganization=TU' \
  -F 'coTenants=[{"name":"राम तामाङ","citizenshipNo":"30-01-70-11111","phone":"9861000002","relationship":"दाइ"}]' \
  -F 'emergencyContactName=हरि तामाङ' -F 'emergencyContactPhone=9841222333' \
  -F 'emergencyContactRelationship=father' -F 'moveInDate=2026-09-15' \
  -F 'declarationInfoCorrect=true' -F 'declarationVisited=true' -F 'declarationAdvanceReady=true' \
  -F 'citizenshipPhotoFront=@/tmp/p1.png' -F 'citizenshipPhotoBack=@/tmp/p2.png')
check "booking created" 'घरबेटीलाई पठाइयो' "$R"
BID=$(echo "$R" | python3 -c 'import sys,json;print(json.load(sys.stdin)["booking"]["id"])')

# 16. Duplicate booking rejected
R=$(curl -s -X POST $API/bookings -H "Authorization: Bearer $TT" \
  -F 'propertyId=1' -F 'tenantName=सीता' -F 'tenantPermanentAddress=धादिङ नीलकण्ठ' \
  -F 'tenantCitizenshipNumber=30-01-76-04321' -F 'tenantPhone=9861000001' \
  -F 'tenantOccupation=student' -F 'emergencyContactName=हरि' -F 'emergencyContactPhone=9841222333' \
  -F 'emergencyContactRelationship=father' -F 'moveInDate=2026-09-15' \
  -F 'declarationInfoCorrect=true' -F 'declarationVisited=true' -F 'declarationAdvanceReady=true' \
  -F 'citizenshipPhotoFront=@/tmp/p1.png' -F 'citizenshipPhotoBack=@/tmp/p2.png')
check "duplicate booking rejected" 'पहिले नै booking' "$R"

# 17. Tenant sees booking with masked landlord phone (pending)
R=$(curl -s $API/bookings/tenant -H "Authorization: Bearer $TT")
check "tenant booking list (masked)" 'XXXXX' "$R"

# 18. Landlord sees request, accepts
R=$(curl -s $API/bookings/landlord -H "Authorization: Bearer $LT")
check "landlord sees request" 'सीता तामाङ' "$R"
R=$(curl -s -X PUT $API/bookings/$BID/accept -H "Authorization: Bearer $LT")
check "landlord accepts" 'स्वीकार गरियो' "$R"

# 19. After accept, tenant sees unmasked phone
R=$(curl -s $API/bookings/tenant -H "Authorization: Bearer $TT")
if echo "$R" | python3 -c "
import sys, json
bs = json.load(sys.stdin)['bookings']
b = [x for x in bs if x['id'] == $BID][0]
assert 'XXXXX' not in b['property']['landlord']['phone'], 'still masked'
print('unmasked-ok')
" | grep -q unmasked-ok; then PASS=$((PASS+1)); echo "✓ phone unmasked after accept"; else FAIL=$((FAIL+1)); echo "✗ phone still masked after accept"; fi

# 20. Re-accept rejected (state guard)
R=$(curl -s -X PUT $API/bookings/$BID/accept -H "Authorization: Bearer $LT")
check "double-accept blocked" 'pending छैन' "$R"

# 21. Tax calculator
R=$(curl -s "$API/tax/calculate?monthlyRent=25000")
check "tax calc 25000 → 30000/yr" '"annualTax":30000' "$R"

# 22. Auth guard
R=$(curl -s $API/bookings/tenant)
check "unauthenticated blocked" 'लगइन आवश्यक' "$R"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ]
