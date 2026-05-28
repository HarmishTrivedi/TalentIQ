# 🧪 Interview Room Testing Guide

## Pre-Testing Setup

### 1. Deploy Changes
```bash
cd ai-recruitment-system
git add .
git commit -m "fix: interview room critical issues"
git push origin main
```

### 2. Wait for Render Deployment
- Backend: https://dashboard.render.com/web/talentiq-backend
- Frontend: https://dashboard.render.com/static/talentiq-frontend
- Wait for both to show "Live" status

### 3. Open Browser Console
- Press F12
- Go to Console tab
- Keep it open during testing

---

## Test Scenarios

### ✅ Test 1: Recruiter Interview Entry

**Steps:**
1. Login as recruiter
2. Go to Interviews page
3. Click "Schedule Interview"
4. Fill in details and schedule
5. Click "Start Interview" or "Join"
6. Check console for errors

**Expected Result:**
- ✅ No `initializeSpeechRecognition is not defined` error
- ✅ Camera/mic permissions requested
- ✅ Video preview shows
- ✅ WebSocket connects successfully
- ✅ No validation errors in console

**If Failed:**
- Check backend logs on Render
- Verify environment variables are set
- Check browser permissions

---

### ✅ Test 2: Candidate Interview Entry

**Steps:**
1. Copy candidate magic link from email or interview details
2. Open in incognito/private window
3. Paste link and press Enter
4. Allow camera/mic permissions
5. Check console for errors

**Expected Result:**
- ✅ No authentication required
- ✅ Interview room loads
- ✅ Video preview shows
- ✅ WebSocket connects
- ✅ No `MissingGreenlet` errors in backend logs

**If Failed:**
- Check if token is valid
- Verify backend `/interviews/join/{id}` endpoint
- Check Render backend logs

---

### ✅ Test 3: Speech Recognition

**Steps:**
1. Enter interview room as recruiter
2. Check if red "Recording" badge shows
3. Speak into microphone: "Testing speech recognition"
4. Open Transcript panel
5. Check if text appears

**Expected Result:**
- ✅ Speech recognition starts automatically
- ✅ Transcript updates in real-time
- ✅ Text appears in transcript panel
- ✅ No errors in console

**If Failed:**
- Check if browser supports speech recognition (Chrome/Edge only)
- Verify microphone permissions
- Check console for speech recognition errors

---

### ✅ Test 4: Video/Audio Controls

**Steps:**
1. Click microphone button
2. Check if mic mutes
3. Click camera button
4. Check if video turns off
5. Toggle both back on

**Expected Result:**
- ✅ Mic mutes/unmutes smoothly
- ✅ Video turns off/on smoothly
- ✅ Visual feedback shows current state
- ✅ No errors in console

---

### ✅ Test 5: Screen Sharing

**Steps:**
1. Click screen share button
2. Select window/screen to share
3. Check if screen appears in main video area
4. Click screen share button again to stop

**Expected Result:**
- ✅ Screen share starts
- ✅ Shared screen shows in main area
- ✅ Screen share stops cleanly
- ✅ Returns to camera view

---

### ✅ Test 6: Chat Functionality

**Steps:**
1. Click chat button
2. Type a message
3. Send message
4. Check if message appears
5. Open chat in another browser (as candidate)
6. Check if message received

**Expected Result:**
- ✅ Chat panel opens
- ✅ Message sends successfully
- ✅ Message appears in chat
- ✅ Other participant receives message
- ✅ WebSocket broadcasts correctly

---

### ✅ Test 7: End Interview (Recruiter)

**Steps:**
1. Enter interview room as recruiter
2. Wait 10 seconds
3. Click red phone button (End Interview)
4. Confirm dialog
5. Check console and network tab

**Expected Result:**
- ✅ Confirmation dialog appears
- ✅ No network retry loops
- ✅ Redirects to analysis page
- ✅ No errors in console
- ✅ Backend logs show "Interview ended successfully"

**If Failed:**
- Check network tab for failed requests
- Check backend logs for validation errors
- Verify `/interviews/{id}/end` endpoint

---

### ✅ Test 8: Leave Interview (Candidate)

**Steps:**
1. Enter interview room as candidate
2. Wait 10 seconds
3. Click red phone button (Leave Interview)
4. Confirm dialog
5. Check console

**Expected Result:**
- ✅ Confirmation dialog appears
- ✅ Redirects to thank you page
- ✅ No errors in console
- ✅ WebSocket closes cleanly

---

### ✅ Test 9: WebSocket Stability

**Steps:**
1. Enter interview room
2. Keep room open for 5 minutes
3. Send chat messages periodically
4. Check console for disconnections

**Expected Result:**
- ✅ WebSocket stays connected
- ✅ No disconnection errors
- ✅ Messages send/receive consistently
- ✅ No reconnection attempts

**If Failed:**
- Check Render logs for timeout errors
- May need to add WebSocket heartbeat
- Verify Render WebSocket support

---

### ✅ Test 10: Multiple Participants

**Steps:**
1. Open interview room as recruiter
2. Open same interview in incognito as candidate
3. Send chat messages from both
4. Toggle video/audio on both
5. End interview from recruiter side

**Expected Result:**
- ✅ Both participants see each other
- ✅ Chat messages sync
- ✅ Video/audio states sync
- ✅ Both redirect when interview ends

---

## Error Checking

### Console Errors to Look For:

❌ **Should NOT see:**
- `initializeSpeechRecognition is not defined`
- `MissingGreenlet`
- `ResponseValidationError`
- `WebSocket connection failed` (repeated)
- `Network Error` (in loops)

✅ **OK to see:**
- `Speech recognition not supported` (in Firefox/Safari)
- `WebSocket closed` (when leaving room)
- Single network errors (not loops)

### Backend Logs to Check:

❌ **Should NOT see:**
- `ValidationError: 2 validation errors`
- `Error extracting attribute: MissingGreenlet`
- `greenlet_spawn has not been called`

✅ **Should see:**
- `✅ Connected to meeting socket`
- `✅ Interview ended successfully`
- `✅ Interview deleted permanently`

---

## Performance Checks

### Video Quality
- [ ] Video is clear and smooth
- [ ] No lag or stuttering
- [ ] Audio is in sync

### Network Quality
- [ ] Network indicator shows "Excellent" or "Good"
- [ ] No packet loss
- [ ] Low latency

### UI Responsiveness
- [ ] Buttons respond immediately
- [ ] No UI freezing
- [ ] Smooth animations

---

## Browser Compatibility

### ✅ Fully Supported
- Chrome (latest)
- Edge (latest)

### ⚠️ Partial Support
- Safari (no speech recognition)
- Firefox (no speech recognition)

### ❌ Not Supported
- Internet Explorer
- Old browser versions

---

## Troubleshooting

### Issue: "initializeSpeechRecognition is not defined"
**Solution**: 
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Verify frontend deployed successfully

### Issue: "MissingGreenlet" in backend logs
**Solution**:
- Verify backend code deployed
- Check if using latest code
- Restart backend service on Render

### Issue: WebSocket keeps disconnecting
**Solution**:
- Check Render WebSocket support
- Verify no firewall blocking
- Check browser console for errors

### Issue: Video not showing
**Solution**:
- Check camera permissions
- Verify HTTPS connection
- Try different browser

### Issue: End interview causes errors
**Solution**:
- Check network tab for failed requests
- Verify backend endpoint working
- Check if interview already completed

---

## Success Criteria

### ✅ All Tests Pass
- [ ] Recruiter can enter room
- [ ] Candidate can enter room
- [ ] Speech recognition works
- [ ] Video/audio controls work
- [ ] Screen sharing works
- [ ] Chat works
- [ ] End interview works (no errors)
- [ ] Leave interview works
- [ ] WebSocket stable
- [ ] Multiple participants work

### ✅ No Critical Errors
- [ ] No console errors
- [ ] No backend validation errors
- [ ] No network retry loops
- [ ] No WebSocket failures

### ✅ Performance Good
- [ ] Video quality good
- [ ] Audio quality good
- [ ] UI responsive
- [ ] No lag

---

## Reporting Issues

If you find issues:

1. **Take Screenshot** of console errors
2. **Copy Backend Logs** from Render
3. **Note Steps to Reproduce**
4. **Check Browser/OS**
5. **Report with details**

---

## Status Tracking

| Test | Status | Notes |
|------|--------|-------|
| Recruiter Entry | ⏳ | |
| Candidate Entry | ⏳ | |
| Speech Recognition | ⏳ | |
| Video/Audio Controls | ⏳ | |
| Screen Sharing | ⏳ | |
| Chat | ⏳ | |
| End Interview | ⏳ | |
| Leave Interview | ⏳ | |
| WebSocket Stability | ⏳ | |
| Multiple Participants | ⏳ | |

Legend:
- ⏳ Not tested
- ✅ Passed
- ❌ Failed
- ⚠️ Partial

---

**Happy Testing! 🚀**
