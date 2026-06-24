const express = require('express');
const router = express.Router();

// Lightweight rooms API that manipulates the SignalingServer globalRooms
// Expects the signaling server instance to be available at req.app.locals.signalingServer

// GET /api/rooms
router.get('/', (req, res) => {
  try {
    const signaling = req.app.locals.signalingServer;
    if (!signaling) return res.status(503).json({ error: 'Signaling server unavailable' });

    const rooms = signaling.getGlobalRoomsList();
    res.json({ rooms });
  } catch (err) {
    console.error('GET /api/rooms error:', err);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// POST /api/rooms - create a new global room
router.post('/', (req, res) => {
  try {
    const signaling = req.app.locals.signalingServer;
    if (!signaling) return res.status(503).json({ error: 'Signaling server unavailable' });

    const body = req.body || {};
    const roomId = body.id || Date.now().toString();

    // Minimal room object
    const room = {
      id: roomId,
      name: body.name || 'New Room',
      type: body.type || 'public',
      host: body.host || 'Unknown',
      hostId: body.hostId || 'unknown',
      hostAvatar: body.hostAvatar || '',
      maxUsers: body.maxUsers || 10,
      tags: body.tags || [],
      createdAt: new Date()
    };

    signaling.globalRooms.set(roomId, room);
    signaling.broadcastGlobalRooms();

    res.status(201).json(room);
  } catch (err) {
    console.error('POST /api/rooms error:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// PATCH /api/rooms/:id - update room metadata
router.patch('/:id', (req, res) => {
  try {
    const signaling = req.app.locals.signalingServer;
    if (!signaling) return res.status(503).json({ error: 'Signaling server unavailable' });

    const id = req.params.id;
    const existing = signaling.globalRooms.get(id);
    if (!existing) return res.status(404).json({ error: 'Room not found' });

    const updates = req.body || {};
    if (updates.name) existing.name = updates.name;
    if (updates.tags) existing.tags = updates.tags;
    if (updates.maxUsers) existing.maxUsers = updates.maxUsers;

    signaling.globalRooms.set(id, existing);
    signaling.broadcastGlobalRooms();

    res.json({ success: true, room: existing });
  } catch (err) {
    console.error('PATCH /api/rooms/:id error:', err);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// DELETE /api/rooms/:id
router.delete('/:id', (req, res) => {
  try {
    const signaling = req.app.locals.signalingServer;
    if (!signaling) return res.status(503).json({ error: 'Signaling server unavailable' });

    const id = req.params.id;
    const existing = signaling.globalRooms.get(id);
    if (!existing) return res.status(404).json({ error: 'Room not found' });

    signaling.globalRooms.delete(id);

    // Also remove active room if present and notify participants
    const activeRoom = signaling.rooms.get(id);
    if (activeRoom) {
      signaling.io.to(id).emit('room-closed', { message: 'Room has been deleted by the host' });
      activeRoom.participants.forEach((p, socketId) => {
        const s = signaling.io.sockets.sockets.get(socketId);
        if (s) {
          s.leave(id);
          s.roomId = null;
        }
      });
      signaling.rooms.delete(id);
    }

    signaling.broadcastGlobalRooms();

    res.json({ success: true, roomId: id });
  } catch (err) {
    console.error('DELETE /api/rooms/:id error:', err);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

module.exports = router;
