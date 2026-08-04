#!/bin/bash
# ================================================================================
# START-ALL — Cloud Lab Monitoring System
# Starts backend + dashboard + agent together on this machine.
# Usage: bash start-all.sh
# ================================================================================

# Kill anything already on the ports
kill $(lsof -ti:5000) 2>/dev/null
kill $(lsof -ti:5173) 2>/dev/null
sleep 2

# 1) Backend API (Express + Socket.IO)
cd server
setsid node src/server.js > /tmp/labmon-server.log 2>&1 < /dev/null &
echo "Backend  PID: $!"

# 2) Dashboard (React/Vite)
cd ../dashboard
setsid npx vite --host 0.0.0.0 --port 5173 > /tmp/labmon-dashboard.log 2>&1 < /dev/null &
echo "Dashboard PID: $!"

# 3) Agent (this machine = one lab PC)
cd ../agent
setsid node src/index.js > /tmp/labmon-agent.log 2>&1 < /dev/null &
echo "Agent     PID: $!"

echo ""
echo "Started. Logs:"
echo "  Backend:   tail -f /tmp/labmon-server.log"
echo "  Dashboard: tail -f /tmp/labmon-dashboard.log"
echo "  Agent:     tail -f /tmp/labmon-agent.log"