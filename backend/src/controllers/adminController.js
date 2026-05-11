const { query, queryOne } = require('../database');

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let conditions = [];
    let params = [];

    if (search) {
      conditions.push('(full_name LIKE ? OR email LIKE ? OR student_id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (role) { conditions.push('role = ?'); params.push(role); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [{ total }] = await query(`SELECT COUNT(*) as total FROM users ${where}`, params);

    const users = await query(`
      SELECT u.id, u.full_name, u.email, u.student_id, u.role, u.department,
             u.is_active, u.is_verified, u.created_at,
             (SELECT COUNT(*) FROM items WHERE user_id = u.id) as item_count,
             (SELECT COUNT(*) FROM messages WHERE sender_id = u.id) as message_count
      FROM users u ${where}
      ORDER BY u.created_at DESC LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({ success: true, data: { users, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// PUT /api/admin/users/:id
const updateUser = async (req, res) => {
  try {
    const { role, is_active } = req.body;
    if (req.params.id == req.user.id) return res.status(400).json({ success: false, message: 'Cannot modify your own account' });
    await query('UPDATE users SET role = ?, is_active = ? WHERE id = ?', [role, is_active ? 1 : 0, req.params.id]);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

// GET /api/admin/claims
const getClaims = async (req, res) => {
  try {
    const { status = 'pending', verification_status } = req.query;
    let queryStr = `
      SELECT cl.*, i.title as item_title, i.type as item_type, i.contact_phone as item_contact,
             u.full_name as claimant_name, u.student_id as claimant_student_id, u.email as claimant_email, u.phone as claimant_phone,
             owner.full_name as owner_name,
             (SELECT url FROM item_images WHERE item_id = i.id AND is_primary = 1 LIMIT 1) as item_image
      FROM claims cl
      JOIN items i ON i.id = cl.item_id
      JOIN users u ON u.id = cl.claimant_id
      JOIN users owner ON owner.id = i.user_id
      WHERE cl.status = ?`;
    
    let params = [status];
    
    if (verification_status) {
      queryStr += ' AND cl.identity_verification_status = ?';
      params.push(verification_status);
    }
    
    queryStr += ' ORDER BY cl.created_at DESC';
    
    const claims = await query(queryStr, params);
    res.json({ success: true, data: claims });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch claims' });
  }
};

// PUT /api/admin/claims/:id
const reviewClaim = async (req, res) => {
  try {
    const { status, admin_note } = req.body;
    const claim = await queryOne(`
      SELECT cl.*, i.user_id as item_owner_id, i.title as item_title, i.id as item_id
      FROM claims cl JOIN items i ON i.id = cl.item_id WHERE cl.id = ?
    `, [req.params.id]);
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

    await query(
      'UPDATE claims SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [status, admin_note || null, req.user.id, claim.id]
    );

    if (status === 'approved') {
      await query("UPDATE items SET status = 'resolved' WHERE id = ?", [claim.item_id]);
      await query(
        "INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'item_resolved', ?, ?)",
        [claim.claimant_id, 'Claim Approved! 🎉', `Your claim for "${claim.item_title}" has been approved.`]
      );
      await query(
        "INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'item_resolved', ?, ?)",
        [claim.item_owner_id, 'Item Resolved', `The item "${claim.item_title}" has been claimed and resolved.`]
      );
    } else if (status === 'rejected') {
      await query(
        "INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, 'system', ?, ?, ?)",
        [claim.claimant_id, 'Claim Not Approved',
         `Your claim for "${claim.item_title}" was not approved. ${admin_note || ''}`,
         JSON.stringify({ item_id: claim.item_id })]
      );
    }

    res.json({ success: true, message: `Claim ${status} successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to review claim' });
  }
};

// GET /api/admin/audit-log
const getAuditLog = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const logs = await query(`
      SELECT al.*, u.full_name, u.email FROM audit_log al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit log' });
  }
};

// PUT /api/admin/claims/:id/verify-identity
const verifyIdentity = async (req, res) => {
  try {
    const { admin_note } = req.body;
    const claim = await queryOne(`
      SELECT cl.*, i.user_id as item_owner_id, i.title as item_title
      FROM claims cl JOIN items i ON i.id = cl.item_id WHERE cl.id = ?
    `, [req.params.id]);
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

    await query(
      'UPDATE claims SET identity_verification_status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      ['verified', req.user.id, claim.id]
    );

    // Notify claimant that identity is verified
    await query(
      "INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'system', ?, ?)",
      [claim.claimant_id, 'Identity Verified ✓', 'Your identity has been verified. Your claim is now under final review.']
    );

    res.json({ success: true, message: 'Identity verified successfully' });
  } catch (err) {
    console.error('Verify identity error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify identity' });
  }
};

// PUT /api/admin/claims/:id/reject-identity
const rejectIdentity = async (req, res) => {
  try {
    const { admin_note } = req.body;
    const claim = await queryOne(`
      SELECT cl.*, i.title as item_title
      FROM claims cl JOIN items i ON i.id = cl.item_id WHERE cl.id = ?
    `, [req.params.id]);
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

    await query(
      'UPDATE claims SET identity_verification_status = ?, status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      ['rejected', 'rejected', admin_note || 'Identity verification failed', req.user.id, claim.id]
    );

    // Notify claimant that identity verification failed
    await query(
      "INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'system', ?, ?)",
      [claim.claimant_id, 'Identity Verification Failed', 
       `Your identity verification for "${claim.item_title}" could not be completed. Please try again with valid documents.`]
    );

    res.json({ success: true, message: 'Identity verification rejected' });
  } catch (err) {
    console.error('Reject identity error:', err);
    res.status(500).json({ success: false, message: 'Failed to reject identity' });
  }
};

module.exports = { getUsers, updateUser, getClaims, reviewClaim, verifyIdentity, rejectIdentity, getAuditLog };
