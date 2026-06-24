// ═══════════════════════════════════════════════════════════════
// Trial & Subscription Routes - IELTSPRACTICE
// Trial status, plan management, payment request handling
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const { verifyToken, checkRole } = require('../middleware/auth');
const { getTrialInfo, AI_LIMITS } = require('../middleware/trialMiddleware');
const prisma = require('../models/prisma');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// GET /api/user/trial-status
// Returns current trial/plan status for the authenticated user
// ═══════════════════════════════════════════════════════════════
router.get('/user/trial-status', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        plan: true,
        trialStartDate: true,
        trialEndDate: true,
        planExpiresAt: true,
        planUpdatedAt: true,
        dailyAiUsageCount: true,
        lastAiUsageDate: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const info = getTrialInfo(user);

    return res.json({
      success: true,
      data: {
        ...info,
        trialStartDate: user.trialStartDate,
        planUpdatedAt: user.planUpdatedAt,
        memberSince: user.createdAt,
        limits: {
          FREE_TRIAL: AI_LIMITS.FREE_TRIAL,
          FREE: AI_LIMITS.FREE,
          BASIC: AI_LIMITS.BASIC,
          PREMIUM: AI_LIMITS.PREMIUM,
        },
      },
    });
  } catch (err) {
    console.error('Trial status error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/admin/upgrade-user
// Admin-only: Change a user's subscription plan
// Body: { userId, plan, durationDays? }
// ═══════════════════════════════════════════════════════════════
router.post('/admin/upgrade-user', verifyToken, checkRole('ADMIN', 'CEO'), async (req, res) => {
  try {
    const { userId, plan, durationDays } = req.body || {};

    if (!userId || !plan) {
      return res.status(400).json({ success: false, message: 'userId and plan are required' });
    }

    const validPlans = ['FREE_TRIAL', 'FREE', 'BASIC', 'PREMIUM'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ success: false, message: `Invalid plan. Must be one of: ${validPlans.join(', ')}` });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updateData = {
      plan,
      planUpdatedAt: new Date(),
    };

    // Set plan expiration for paid plans
    if ((plan === 'BASIC' || plan === 'PREMIUM') && durationDays) {
      updateData.planExpiresAt = new Date(Date.now() + parseInt(durationDays) * 24 * 60 * 60 * 1000);
    }

    // If upgrading from FREE, reset trial dates
    if (plan === 'FREE_TRIAL') {
      updateData.trialStartDate = new Date();
      updateData.trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: updateData,
      select: {
        id: true,
        full_name: true,
        email: true,
        plan: true,
        trialEndDate: true,
        planExpiresAt: true,
        planUpdatedAt: true,
      },
    });

    console.log(`[Admin] User ${updated.email} plan changed to ${plan} by admin ${req.user.id}`);

    return res.json({
      success: true,
      message: `User plan updated to ${plan}`,
      data: updated,
    });
  } catch (err) {
    console.error('Admin upgrade user error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/payment/request
// Submit a manual payment request (Humo/Uzcard card-to-card)
// Body: { plan, amount, method, proofImageUrl?, note? }
// ═══════════════════════════════════════════════════════════════
router.post('/payment/request', verifyToken, async (req, res) => {
  try {
    const { plan, amount, method, proofImageUrl, note } = req.body || {};

    if (!plan || !amount || !method) {
      return res.status(400).json({
        success: false,
        message: 'plan, amount, and method are required',
      });
    }

    const validPlans = ['BASIC', 'PREMIUM'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ success: false, message: 'Plan must be BASIC or PREMIUM' });
    }

    const validMethods = ['VISA_MASTERCARD', 'HUMO', 'UZCARD', 'MANUAL'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ success: false, message: `Method must be one of: ${validMethods.join(', ')}` });
    }

    // Check for existing pending request (only block if not instant mock approval)
    const isMockInstant = (method === 'HUMO' || method === 'UZCARD') && (req.body.instant === true || process.env.AUTO_APPROVE_LOCAL_PAYMENTS === 'true');

    if (!isMockInstant) {
      const existingPending = await prisma.paymentRequest.findFirst({
        where: { userId: req.user.id, status: 'PENDING' },
      });

      if (existingPending) {
        return res.status(400).json({
          success: false,
          message: 'You already have a pending payment request. Please wait for it to be reviewed.',
        });
      }
    }

    const status = isMockInstant ? 'APPROVED' : 'PENDING';
    const reviewedAt = isMockInstant ? new Date() : null;

    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        userId: req.user.id,
        plan,
        amount: parseFloat(amount),
        method,
        status,
        proofImageUrl: proofImageUrl || null,
        note: note || null,
        reviewedAt,
      },
    });

    if (isMockInstant) {
      const days = 30; // 30 days duration
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          plan,
          planExpiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
          planUpdatedAt: new Date(),
        },
      });
      console.log(`[Payment] User ${req.user.id} plan upgraded instantly to ${plan} (Mock ${method} approval)`);
    }

    return res.status(201).json({
      success: true,
      message: isMockInstant
        ? `Payment verified instantly! Your account is now upgraded to ${plan}.`
        : 'Payment request submitted. We will review it shortly.',
      data: {
        id: paymentRequest.id,
        plan: paymentRequest.plan,
        amount: paymentRequest.amount,
        method: paymentRequest.method,
        status: paymentRequest.status,
        createdAt: paymentRequest.createdAt,
      },
    });
  } catch (err) {
    console.error('Payment request error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/payment/my-requests
// Get current user's payment request history
// ═══════════════════════════════════════════════════════════════
router.get('/payment/my-requests', verifyToken, async (req, res) => {
  try {
    const requests = await prisma.paymentRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return res.json({
      success: true,
      data: requests,
    });
  } catch (err) {
    console.error('Get payment requests error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/admin/payment-requests
// Admin: View all pending payment requests
// ═══════════════════════════════════════════════════════════════
router.get('/admin/payment-requests', verifyToken, checkRole('ADMIN', 'CEO'), async (req, res) => {
  try {
    const status = req.query.status || 'PENDING';
    const requests = await prisma.paymentRequest.findMany({
      where: { status },
      include: {
        user: {
          select: { id: true, full_name: true, email: true, plan: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({
      success: true,
      data: requests,
    });
  } catch (err) {
    console.error('Admin get payment requests error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/admin/review-payment
// Admin: Approve or reject a payment request
// Body: { requestId, action: 'APPROVED'|'REJECTED', durationDays?, note? }
// ═══════════════════════════════════════════════════════════════
router.post('/admin/review-payment', verifyToken, checkRole('ADMIN', 'CEO'), async (req, res) => {
  try {
    const { requestId, action, durationDays, note } = req.body || {};

    if (!requestId || !action) {
      return res.status(400).json({ success: false, message: 'requestId and action are required' });
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be APPROVED or REJECTED' });
    }

    const paymentReq = await prisma.paymentRequest.findUnique({ where: { id: parseInt(requestId) } });
    if (!paymentReq) {
      return res.status(404).json({ success: false, message: 'Payment request not found' });
    }

    if (paymentReq.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Payment request already reviewed' });
    }

    // Update payment request
    await prisma.paymentRequest.update({
      where: { id: parseInt(requestId) },
      data: {
        status: action,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        note: note || null,
      },
    });

    // If approved, upgrade the user's plan
    if (action === 'APPROVED') {
      const days = parseInt(durationDays) || 30;
      await prisma.user.update({
        where: { id: paymentReq.userId },
        data: {
          plan: paymentReq.plan,
          planExpiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
          planUpdatedAt: new Date(),
        },
      });

      console.log(`[Payment] User ${paymentReq.userId} upgraded to ${paymentReq.plan} for ${days} days`);
    }

    return res.json({
      success: true,
      message: `Payment request ${action.toLowerCase()}`,
    });
  } catch (err) {
    console.error('Admin review payment error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/payment/lemon-webhook
// LemonSqueezy webhook handler for Visa/Mastercard payments
// ═══════════════════════════════════════════════════════════════
router.post('/payment/lemon-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // LemonSqueezy sends JSON body with signature
    const signature = req.headers['x-signature'];
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const crypto = require('crypto');
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSig) {
        console.error('[LemonSqueezy] Invalid webhook signature');
        return res.status(401).json({ message: 'Invalid signature' });
      }
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventName = event?.meta?.event_name;

    console.log(`[LemonSqueezy] Webhook received: ${eventName}`);

    const data = event.data;
    const attrs = data?.attributes;
    const customData = event?.meta?.custom_data || {};

    if (
      eventName === 'order_created' ||
      eventName === 'subscription_created' ||
      eventName === 'subscription_payment_success'
    ) {
      const email = attrs?.user_email || attrs?.customer_email || customData.email || customData.plan_email;
      const total = attrs?.total || attrs?.amount || 0;
      const orderId = String(data?.id);

      // Determine plan from custom data or metadata
      const plan = customData.plan || 'BASIC';
      const durationDays = parseInt(customData.duration_days) || 30;

      if (email) {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

        if (user) {
          // Create payment record
          await prisma.paymentRequest.create({
            data: {
              userId: user.id,
              plan,
              amount: total / 100, // LemonSqueezy amounts are in cents
              currency: attrs?.currency || 'USD',
              method: 'VISA_MASTERCARD',
              status: 'APPROVED',
              lsOrderId: orderId,
              reviewedAt: new Date(),
            },
          });

          // Upgrade user
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan,
              planExpiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
              planUpdatedAt: new Date(),
            },
          });

          console.log(`[LemonSqueezy] User ${email} plan set to ${plan} via event ${eventName} (ID: ${orderId})`);
        } else {
          console.warn(`[LemonSqueezy] User not found: ${email}`);
        }
      }
    } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
      const email = attrs?.user_email || attrs?.customer_email || customData.email || customData.plan_email;

      if (email) {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

        if (user) {
          // Downgrade user
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: 'FREE',
              planExpiresAt: null,
              planUpdatedAt: new Date(),
            },
          });
          console.log(`[LemonSqueezy] User ${email} subscription cancelled/expired. Plan set to FREE.`);
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('LemonSqueezy webhook error:', err);
    return res.status(500).json({ message: 'Webhook processing error' });
  }
});

module.exports = router;
