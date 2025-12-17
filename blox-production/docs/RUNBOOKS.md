# Operational Runbooks

## Incident Response

### High Error Rate

1. **Check Sentry Dashboard**
   - Identify error patterns
   - Check affected users
   - Review error stack traces

2. **Check Application Health**
   - Verify Supabase connectivity
   - Check API response times
   - Review recent deployments

3. **Mitigation Steps**
   - Rollback recent deployment if needed
   - Scale resources if needed
   - Disable problematic features via feature flags

### Database Connection Issues

1. **Symptoms**
   - 503 errors
   - Timeout errors
   - Slow query responses

2. **Diagnosis**
   - Check Supabase dashboard
   - Review connection pool usage
   - Check for long-running queries

3. **Resolution**
   - Restart connection pool
   - Optimize slow queries
   - Scale database if needed

### Performance Degradation

1. **Check Metrics**
   - Web Vitals scores
   - API response times
   - Bundle sizes

2. **Investigation**
   - Review recent code changes
   - Check for memory leaks
   - Analyze bundle composition

3. **Optimization**
   - Optimize slow queries
   - Reduce bundle size
   - Implement caching

## Deployment Procedures

### Staging Deployment

1. Create release branch
2. Run CI pipeline
3. Deploy to staging
4. Run smoke tests
5. Verify functionality

### Production Deployment

1. Get approval
2. Schedule deployment window
3. Create backup
4. Deploy to production
5. Monitor for issues
6. Run smoke tests
7. Verify metrics

### Rollback Procedure

1. Identify last known good version
2. Revert deployment
3. Verify application health
4. Notify team
5. Document incident

## Monitoring

### Key Metrics

- Error rate: < 1%
- Response time: < 500ms (p95)
- Uptime: > 99.9%
- Web Vitals: All passing

### Alerts

- Error rate > 5%
- Response time > 2s
- Database connection failures
- Failed deployments

## Escalation

1. **Level 1**: Development team
2. **Level 2**: Engineering lead
3. **Level 3**: CTO/VP Engineering

## Post-Incident

1. Document incident
2. Root cause analysis
3. Create action items
4. Update runbooks
5. Share learnings

