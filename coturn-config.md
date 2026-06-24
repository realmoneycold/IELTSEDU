# Coturn TURN Server Setup Guide

## Overview
Coturn provides STUN/TURN services required for WebRTC to work across NAT/firewalls. This is essential for the Live Hub voice/video chat.

## Installation

### On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install coturn
```

### On CentOS/RHEL:
```bash
sudo yum install coturn
# or
sudo dnf install coturn
```

## Configuration

Create or edit `/etc/turnserver.conf`:

```bash
sudo nano /etc/turnserver.conf
```

Add the following configuration:

```conf
# TURN server settings
listening-port=3478
tls-listening-port=5349
listening-ip=YOUR_SERVER_IP
relay-ip=YOUR_SERVER_IP
external-ip=YOUR_SERVER_IP

# Authentication
lt-cred-mech
user=ieltspractice:your-secure-password
realm=ieltspractice.com

# Security
no-stdout-log
syslog
# Uncomment for verbose logging
# verbose

# Connection limits
max-bps=0
# Bandwidth limit per session (bytes/sec)
# bps-capacity=0

# TLS/SSL (optional but recommended)
# cert=/path/to/cert.pem
# pkey=/path/to/key.pem
# cipher-list="ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512"

# Deny specific peer addresses (security)
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255

# Allow loopback for testing (remove in production)
allowed-peer-ip=127.0.0.1

# Run as daemon
proc-user=turnserver
proc-group=turnserver
```

## Environment Variables

Add these to your backend `.env` file:

```bash
# Coturn TURN Server Configuration
COTURN_URL=turn:YOUR_SERVER_IP:3478
COTURN_USER=ieltspractice
COTURN_PASS=your-secure-password
```

## Start Coturn

### As a service:
```bash
# Enable auto-start
sudo systemctl enable coturn

# Start
sudo systemctl start coturn

# Check status
sudo systemctl status coturn
```

### Manual (for testing):
```bash
sudo turnserver -c /etc/turnserver.conf
```

## Testing the TURN Server

### Test with turnutils:
```bash
# Test STUN
turnutils_uclient -u ieltspractice -w your-secure-password turn:YOUR_SERVER_IP:3478

# Test with TLS
turnutils_uclient -u ieltspractice -w your-secure-password -S turns:YOUR_SERVER_IP:5349
```

### Test with browser:
1. Open https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
2. Add TURN server: `turn:YOUR_SERVER_IP:3478`
3. Add username: `ieltspractice`
4. Add credential: `your-secure-password`
5. Click "Add Server"
6. Click "Gather candidates"
7. You should see "relay" candidates

## Firewall Configuration

Open these ports:

```bash
# UFW (Ubuntu)
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 49152:65535/udp  # Relay ports

# iptables
sudo iptables -A INPUT -p tcp --dport 3478 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 3478 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5349 -j ACCEPT
sudo iptables -A INPUT -p udp --sport 49152:65535 -j ACCEPT
```

## Updating WebRTC Manager

Once Coturn is running, update `js/webrtcManager.js`:

```javascript
this.iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    {
        urls: 'turn:YOUR_SERVER_IP:3478',
        username: 'ieltspractice',
        credential: 'your-secure-password'
    }
];
```

## Security Recommendations

1. **Use strong passwords** - At least 16 characters with mixed case, numbers, and symbols
2. **Enable TLS** - Use certificates for encrypted connections
3. **Restrict relay ports** - Limit UDP port range to reduce attack surface
4. **Monitor usage** - Check logs regularly for unusual activity
5. **Rate limiting** - Consider implementing at firewall level

## Troubleshooting

### Server won't start:
- Check if ports are already in use: `sudo netstat -tlnp | grep 3478`
- Verify configuration syntax: `sudo turnserver -c /etc/turnserver.conf --check`
- Check logs: `sudo tail -f /var/log/syslog | grep turnserver`

### No relay candidates:
- Verify firewall rules allow UDP traffic
- Check external-ip is correct in config
- Test with: `turnutils_uclient -v -u ieltspractice -w password turn:IP:3478`

### Connection fails:
- Ensure both TCP and UDP ports are open
- Check if server is behind NAT (use external-ip)
- Verify credentials match between server and client

## Production Deployment

For production, consider:
1. Using a dedicated TURN server (separate from application server)
2. Implementing credential rotation
3. Using time-limited credentials (TURN REST API)
4. Monitoring bandwidth usage
5. Setting up alerts for service availability

## Alternative: Cloud TURN Services

If self-hosting is not preferred:
- **Twilio**: https://www.twilio.com/stun-turn
- **Xirsys**: https://xirsys.com/
- **Metered.ca**: https://www.metered.ca/

These provide managed TURN services with global infrastructure.
