# 🎯 PRODUCTION DEPLOYMENT GUIDE - TBA-WAAD Integration Fixes

**Status:** ✅ READY FOR PRODUCTION  
**Date:** December 20, 2025  
**Risk Level:** 🟢 LOW  

---

## 📋 WHAT WAS FIXED

### 3 Critical Issues Resolved

1. **EmployerController Response Wrapping** ✅
   - File: `backend/src/main/java/com/waad/tba/modules/employer/controller/EmployerController.java`
   - Change: Wrapped all responses in `ApiResponse`
   - Impact: Frontend can now properly unwrap data

2. **Frontend Environment Configuration** ✅
   - File: `frontend/.env.example` (NEW)
   - Change: Created environment template
   - Impact: Developers know what variables to set

3. **Vite Config VITE_API_URL Loading** ✅
   - File: `frontend/vite.config.mjs`
   - Change: Explicit VITE_API_URL loading
   - Impact: Configuration is now documented

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Backend Deployment

```bash
# 1. Navigate to backend
cd backend

# 2. Build backend
mvn clean package

# 3. Verify build succeeds
# Output should show: BUILD SUCCESS

# 4. Deploy JAR to production server
# Copy: target/tba-waad-system-backend-*.jar
# To: /opt/tba-waad/backend/

# 5. Start backend service
java -jar /opt/tba-waad/backend/tba-waad-system-backend-*.jar

# 6. Verify backend is running
curl -X GET http://localhost:8080/api/employers \
  -H "Content-Type: application/json"

# Expected: HTTP 200 with wrapped response
```

### Step 2: Frontend Deployment

```bash
# 1. Navigate to frontend
cd frontend

# 2. Create production environment file
cp .env.example .env.production

# 3. Edit .env.production with production values
# VITE_API_URL=https://api.production.com/api
# VITE_APP_BASE_NAME=/

# 4. Build frontend
yarn build

# 5. Verify build succeeds
# Output should show: dist/ folder created

# 6. Deploy dist/ folder to web server
# Copy: dist/*
# To: /var/www/tba-waad/

# 7. Configure web server (nginx/apache)
# Point root to: /var/www/tba-waad/
# Configure SPA routing (all requests → index.html)
```

### Step 3: Post-Deployment Verification

```bash
# 1. Test backend API
curl -X GET https://api.production.com/api/employers \
  -H "Content-Type: application/json"

# Expected: HTTP 200, wrapped response

# 2. Test frontend loads
curl -X GET https://app.production.com/

# Expected: HTTP 200, HTML content

# 3. Test login
# Navigate to: https://app.production.com/
# Login with credentials
# Expected: Redirected to dashboard

# 4. Test Employers page
# Navigate to: https://app.production.com/employers
# Expected: Page loads, shows empty state

# 5. Check browser console
# Expected: No errors, successful API calls
```

---

## ✅ VERIFICATION CHECKLIST

### Before Deployment
- [ ] Backend compiles: `mvn clean compile`
- [ ] Frontend builds: `yarn build`
- [ ] All smoke tests pass locally
- [ ] No console errors or warnings
- [ ] Git commits created and pushed

### During Deployment
- [ ] Backend service starts successfully
- [ ] Frontend files deployed to web server
- [ ] Environment variables set correctly
- [ ] Database connection verified
- [ ] CORS configuration verified

### After Deployment
- [ ] Backend API responds (HTTP 200)
- [ ] Frontend loads without errors
- [ ] Login works
- [ ] Employers page loads
- [ ] Insurance Companies page loads
- [ ] Reviewer Companies page loads
- [ ] No 500 errors in logs
- [ ] No CORS errors in browser console
- [ ] No 404 errors

---

## 🔧 CONFIGURATION

### Backend Configuration

**File:** `backend/src/main/resources/application.yml`

```yaml
server:
  port: 8080
  servlet:
    session:
      timeout: 30m
      cookie:
        name: JSESSIONID
        http-only: true
        same-site: strict
        secure: true  # Set to true in production (HTTPS)
```

### Frontend Configuration

**File:** `frontend/.env.production`

```env
# Production API URL
VITE_API_URL=https://api.production.com/api

# App base path
VITE_APP_BASE_NAME=/

# Analytics (optional)
VITE_APP_PUBLIC_ANALYTICS_ID=your-ga-id
VITE_APP_PUBLIC_CLARITY_ID=your-clarity-id
VITE_APP_PUBLIC_NOTIFY_ID=your-notify-id
```

### Web Server Configuration (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name app.production.com;

    ssl_certificate /etc/ssl/certs/your-cert.crt;
    ssl_certificate_key /etc/ssl/private/your-key.key;

    root /var/www/tba-waad;
    index index.html;

    # SPA routing: all requests → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🐛 TROUBLESHOOTING

### Issue: Backend returns 500 error

**Symptoms:**
- `GET /api/employers` returns HTTP 500
- Error in backend logs

**Solution:**
```bash
# 1. Check backend logs
tail -f /var/log/tba-waad/backend.log

# 2. Verify database connection
# Check: Database is running and accessible

# 3. Verify Spring Boot started
# Look for: "Started TbaWaadApplication"

# 4. Check for compilation errors
mvn clean compile
```

---

### Issue: Frontend shows blank page

**Symptoms:**
- Frontend loads but shows blank page
- No errors in console

**Solution:**
```bash
# 1. Check browser console for errors
# Open DevTools → Console tab

# 2. Verify frontend files deployed
ls -la /var/www/tba-waad/

# 3. Check web server logs
tail -f /var/log/nginx/error.log

# 4. Verify SPA routing configured
# All requests should go to index.html
```

---

### Issue: API calls return 404

**Symptoms:**
- Network tab shows 404 for `/api/employers`
- Backend is running

**Solution:**
```bash
# 1. Verify backend is running
curl -X GET http://localhost:8080/api/employers

# 2. Check VITE_API_URL in .env.production
cat .env.production | grep VITE_API_URL

# 3. Verify API proxy in web server
# Check nginx config for /api/ location

# 4. Check backend logs for errors
tail -f /var/log/tba-waad/backend.log
```

---

### Issue: CORS error in browser console

**Symptoms:**
- Console shows: "Access to XMLHttpRequest blocked by CORS policy"
- API calls fail

**Solution:**
```bash
# 1. Verify backend CORS configuration
# Check: application.yml has CORS settings

# 2. Verify frontend origin
# Should be: https://app.production.com

# 3. Check backend allows credentials
# Should have: withCredentials: true

# 4. Verify HTTPS is used
# Frontend: https://app.production.com
# Backend: https://api.production.com
```

---

## 📊 ROLLBACK PLAN

### If Issues Occur

1. **Immediate Rollback**
   ```bash
   # 1. Stop current backend
   systemctl stop tba-waad-backend
   
   # 2. Restore previous backend version
   cp /opt/tba-waad/backup/backend-previous.jar \
      /opt/tba-waad/backend/tba-waad-system-backend.jar
   
   # 3. Start previous backend
   systemctl start tba-waad-backend
   
   # 4. Restore previous frontend
   rm -rf /var/www/tba-waad/*
   cp -r /var/www/tba-waad-backup/* /var/www/tba-waad/
   
   # 5. Verify services are running
   curl -X GET https://api.production.com/api/employers
   ```

2. **Notify Team**
   - Document what went wrong
   - Create incident report
   - Schedule post-mortem

3. **Investigate**
   - Check backend logs
   - Check frontend console
   - Check web server logs
   - Identify root cause

---

## 📈 MONITORING

### Key Metrics to Monitor

1. **Backend Health**
   - API response time (should be < 500ms)
   - Error rate (should be < 1%)
   - Database connection pool usage
   - Memory usage

2. **Frontend Health**
   - Page load time (should be < 3s)
   - JavaScript errors (should be 0)
   - API call success rate (should be > 99%)
   - User session duration

3. **Infrastructure**
   - CPU usage (should be < 70%)
   - Memory usage (should be < 80%)
   - Disk usage (should be < 80%)
   - Network latency (should be < 100ms)

### Monitoring Tools

```bash
# Backend logs
tail -f /var/log/tba-waad/backend.log

# Frontend errors (via browser console)
# Check: https://app.production.com/

# Web server logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System metrics
top
df -h
netstat -an
```

---

## 📞 SUPPORT CONTACTS

### During Deployment
- **Backend Issues:** Check backend logs, verify database
- **Frontend Issues:** Check browser console, verify web server
- **Network Issues:** Check CORS, verify firewall rules

### After Deployment
- **Performance Issues:** Monitor metrics, check logs
- **User Issues:** Check browser console, verify API responses
- **Data Issues:** Check database, verify migrations

---

## ✅ FINAL CHECKLIST

### Pre-Deployment
- [ ] All code changes reviewed and approved
- [ ] All tests pass locally
- [ ] Backup of current production created
- [ ] Deployment plan documented
- [ ] Team notified of deployment window

### Deployment
- [ ] Backend deployed and verified
- [ ] Frontend deployed and verified
- [ ] Environment variables set correctly
- [ ] Database migrations completed (if any)
- [ ] Services restarted successfully

### Post-Deployment
- [ ] All smoke tests pass
- [ ] No errors in logs
- [ ] Users can login
- [ ] All pages load correctly
- [ ] API calls succeed
- [ ] Performance is acceptable

### Sign-Off
- [ ] Deployment successful
- [ ] All systems operational
- [ ] Team notified of completion
- [ ] Monitoring enabled

---

## 📝 DEPLOYMENT RECORD

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Approved By:** _______________  

**Backend Version:** _______________  
**Frontend Version:** _______________  

**Issues Encountered:** 
```
_________________________________________________________________
_________________________________________________________________
```

**Resolution:** 
```
_________________________________________________________________
_________________________________________________________________
```

**Status:** ☐ SUCCESS ☐ PARTIAL ☐ FAILED

**Sign-Off:** _______________  
**Date:** _______________

---

## 📚 RELATED DOCUMENTS

1. [INTEGRATION-ANALYSIS-SUMMARY.md](./INTEGRATION-ANALYSIS-SUMMARY.md) - Executive summary
2. [INTEGRATION-FIXES-REPORT.md](./INTEGRATION-FIXES-REPORT.md) - Detailed technical analysis
3. [FIX-LIST.md](./FIX-LIST.md) - Quick reference guide
4. [SMOKE-TEST-CHECKLIST.md](./SMOKE-TEST-CHECKLIST.md) - Testing procedures
5. [API-CONTRACT.md](./API-CONTRACT.md) - API specifications

---

**Report Generated:** December 20, 2025  
**Status:** READY FOR PRODUCTION DEPLOYMENT

---

**END OF DEPLOYMENT GUIDE**
