const { query, queryOne, transaction } = require('../database');
const { runMatchingForItem } = require('../services/aiMatchingService');
const path = require('path');
const fs = require('fs');

// GET /api/items — list with filters, pagination, search
const getItems = async (req, res) => {
  try {
    const {
      type, status = 'open', category_id, location_id,
      search, page = 1, limit = 12, sort = 'newest',
      date_from, date_to, user_id
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let conditions = ['i.status != "archived"'];
    let params = [];

    if (type) { conditions.push('i.type = ?'); params.push(type); }
    if (status && status !== 'all') { conditions.push('i.status = ?'); params.push(status); }
    if (category_id) { conditions.push('i.category_id = ?'); params.push(category_id); }
    if (location_id) { conditions.push('i.location_id = ?'); params.push(location_id); }
    if (user_id) { conditions.push('i.user_id = ?'); params.push(user_id); }
    if (date_from) { conditions.push('i.date_occurred >= ?'); params.push(date_from); }
    if (date_to) { conditions.push('i.date_occurred <= ?'); params.push(date_to); }
    if (search) {
      conditions.push('(i.title LIKE ? OR i.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderMap = {
      newest: 'i.created_at DESC',
      oldest: 'i.created_at ASC',
      date_asc: 'i.date_occurred ASC',
      date_desc: 'i.date_occurred DESC'
    };
    const orderBy = orderMap[sort] || 'i.created_at DESC';

    const countQuery = `SELECT COUNT(*) as total FROM items i ${where}`;
    const countResult = await query(countQuery, params);
    const total = countResult[0].total;

    const itemsQuery = `
      SELECT i.id, i.type, i.title, i.description, i.status, i.date_occurred,
             i.reward_offered, i.reward_amount, i.view_count, i.is_valuable,
             i.location_detail, i.created_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             l.name as location_name, l.building as location_building,
             u.full_name as reporter_name, u.student_id as reporter_student_id,
             u.avatar_url as reporter_avatar,
             (SELECT url FROM item_images WHERE item_id = i.id AND is_primary = 1 LIMIT 1) as primary_image,
             (SELECT COUNT(*) FROM ai_matches WHERE lost_item_id = i.id OR found_item_id = i.id) as match_count
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN locations l ON i.location_id = l.id
      LEFT JOIN users u ON i.user_id = u.id
      ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`;

    const items = await query(itemsQuery, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    console.error('Get items error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch items' });
  }
};

// GET /api/items/:id
const getItemById = async (req, res) => {
  try {
    const item = await queryOne(`
      SELECT i.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             l.name as location_name, l.building, l.description as location_desc,
             u.full_name as reporter_name, u.student_id as reporter_student_id,
             u.avatar_url as reporter_avatar, u.id as reporter_id,
             u.department as reporter_department, u.phone as reporter_phone
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN locations l ON i.location_id = l.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    // Increment view count
    await query('UPDATE items SET view_count = view_count + 1 WHERE id = ?', [item.id]);

    // Get images
    const images = await query('SELECT * FROM item_images WHERE item_id = ? ORDER BY is_primary DESC', [item.id]);

    // Get AI matches
    const matches = await query(`
      SELECT am.*,
             CASE WHEN am.lost_item_id = ? THEN am.found_item_id ELSE am.lost_item_id END as matched_item_id,
             i.title as matched_title, i.type as matched_type, i.status as matched_status,
             i.date_occurred as matched_date, i.location_detail as matched_location,
             c.name as matched_category, c.icon as matched_icon,
             u.full_name as matched_reporter,
             (SELECT url FROM item_images WHERE item_id = i.id AND is_primary = 1 LIMIT 1) as matched_image
      FROM ai_matches am
      JOIN items i ON i.id = CASE WHEN am.lost_item_id = ? THEN am.found_item_id ELSE am.lost_item_id END
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE (am.lost_item_id = ? OR am.found_item_id = ?) AND am.status != 'rejected'
      ORDER BY am.confidence_score DESC
      LIMIT 5
    `, [item.id, item.id, item.id, item.id]);

    res.json({ success: true, data: { ...item, images, matches } });
  } catch (err) {
    console.error('Get item error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch item' });
  }
};

// POST /api/items
const createItem = async (req, res) => {
  try {
    const {
      type, title, description, category_id, location_id,
      location_detail, date_occurred, is_valuable, reward_offered, reward_amount,
      contact_phone
    } = req.body;

    const result = await query(`
      INSERT INTO items (user_id, type, title, description, category_id, location_id,
                        location_detail, date_occurred, is_valuable, reward_offered, reward_amount, contact_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id, type, title, description,
      category_id || null, location_id || null, location_detail || null,
      date_occurred, is_valuable ? 1 : 0,
      reward_offered ? 1 : 0, reward_amount || null,
      contact_phone || null
    ]);

    const itemId = result.insertId;

    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        await query(
          'INSERT INTO item_images (item_id, url, is_primary) VALUES (?, ?, ?)',
          [itemId, `/uploads/${file.filename}`, i === 0 ? 1 : 0]
        );
      }
    }

    // Log audit
    await query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [req.user.id, 'CREATE_ITEM', 'item', itemId]
    );

    // Run AI matching asynchronously (don't block response)
    setImmediate(() => runMatchingForItem(itemId));

    const newItem = await queryOne('SELECT * FROM items WHERE id = ?', [itemId]);
    res.status(201).json({ success: true, message: 'Item reported successfully', data: newItem });
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ success: false, message: 'Failed to report item' });
  }
};

// PUT /api/items/:id
const updateItem = async (req, res) => {
  try {
    const item = await queryOne('SELECT * FROM items WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    if (item.user_id !== req.user.id && !['admin', 'security'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    const { title, description, category_id, location_id, location_detail,
            date_occurred, status, is_valuable, reward_offered, reward_amount, contact_phone } = req.body;

    await query(`
      UPDATE items SET title = ?, description = ?, category_id = ?, location_id = ?,
      location_detail = ?, date_occurred = ?, status = ?, is_valuable = ?,
      reward_offered = ?, reward_amount = ?, contact_phone = ?
      WHERE id = ?
    `, [
      title || item.title, description || item.description,
      category_id || item.category_id, location_id || item.location_id,
      location_detail || item.location_detail, date_occurred || item.date_occurred,
      status || item.status, is_valuable !== undefined ? is_valuable : item.is_valuable,
      reward_offered !== undefined ? reward_offered : item.reward_offered,
      reward_amount || item.reward_amount, 
      contact_phone !== undefined ? contact_phone : item.contact_phone, item.id
    ]);

    res.json({ success: true, message: 'Item updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update item' });
  }
};

// DELETE /api/items/:id
const deleteItem = async (req, res) => {
  try {
    const item = await queryOne('SELECT * FROM items WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    if (item.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    await query('UPDATE items SET status = "archived" WHERE id = ?', [item.id]);
    res.json({ success: true, message: 'Item removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete item' });
  }
};

// GET /api/items/stats/overview
const getStats = async (req, res) => {
  try {
    const [totalLost] = await query("SELECT COUNT(*) as count FROM items WHERE type = 'lost' AND status != 'archived'");
    const [totalFound] = await query("SELECT COUNT(*) as count FROM items WHERE type = 'found' AND status != 'archived'");
    const [resolved] = await query("SELECT COUNT(*) as count FROM items WHERE status = 'resolved'");
    const [todayItems] = await query("SELECT COUNT(*) as count FROM items WHERE DATE(created_at) = DATE('now', 'localtime')");
    const [totalUsers] = await query("SELECT COUNT(*) as count FROM users WHERE role IN ('student', 'staff')");
    const [pendingClaims] = await query("SELECT COUNT(*) as count FROM claims WHERE status = 'pending'");

    const recentActivity = await query(`
      SELECT i.id, i.type, i.title, i.status, i.created_at,
             c.icon as category_icon, u.full_name as reporter_name
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.status != 'archived'
      ORDER BY i.created_at DESC LIMIT 5
    `);

    const categoryBreakdown = await query(`
      SELECT c.name, c.icon, c.color,
             COUNT(CASE WHEN i.type = 'lost' THEN 1 END) as lost_count,
             COUNT(CASE WHEN i.type = 'found' THEN 1 END) as found_count
      FROM categories c
      LEFT JOIN items i ON i.category_id = c.id AND i.status != 'archived'
      GROUP BY c.id ORDER BY (lost_count + found_count) DESC LIMIT 6
    `);

    res.json({
      success: true,
      data: {
        total_lost: totalLost.count,
        total_found: totalFound.count,
        total_resolved: resolved.count,
        today_items: todayItems.count,
        total_users: totalUsers.count,
        pending_claims: pendingClaims.count,
        recovery_rate: resolved.count > 0 ? Math.round((resolved.count / (totalLost.count || 1)) * 100) : 0,
        recent_activity: recentActivity,
        category_breakdown: categoryBreakdown
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
};

// POST /api/items/:id/claim
const claimItem = async (req, res) => {
  try {
    const { proof_description, identity_document, verification_answers } = req.body;
    const item = await queryOne('SELECT * FROM items WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.user_id === req.user.id) return res.status(400).json({ success: false, message: 'Cannot claim your own item' });

    const existing = await queryOne('SELECT id FROM claims WHERE item_id = ? AND claimant_id = ?', [item.id, req.user.id]);
    if (existing) return res.status(409).json({ success: false, message: 'You already submitted a claim for this item' });

    const proofImageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Hash the verification answers for security
    const crypto = require('crypto');
    const answersHash = verification_answers ? crypto.createHash('sha256').update(verification_answers).digest('hex') : null;
    
    await query(
      `INSERT INTO claims (item_id, claimant_id, proof_description, proof_image_url, 
                           identity_document_url, verification_answers_hash, identity_verification_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id, req.user.id, proof_description, proofImageUrl,
        identity_document || null, answersHash, 
        identity_document ? 'pending' : 'pending'
      ]
    );

    // Notify item owner
    await query(
      "INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, 'claim_request', ?, ?, ?)",
      [item.user_id, 'New claim on your item', `Someone submitted a claim for "${item.title}"`,
       JSON.stringify({ item_id: item.id })]
    );

    res.json({ success: true, message: 'Claim submitted successfully. We will verify your identity and notify you.' });
  } catch (err) {
    console.error('Claim item error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit claim' });
  }
};

// GET /api/claims/:id — get claim details
const getClaimById = async (req, res) => {
  try {
    const claim = await queryOne(`
      SELECT cl.*, i.title as item_title, i.type as item_type, i.description as item_description,
             u.full_name as claimant_name, u.student_id as claimant_student_id, u.email as claimant_email,
             owner.full_name as owner_name, owner.phone as owner_phone,
             (SELECT url FROM item_images WHERE item_id = i.id AND is_primary = 1 LIMIT 1) as item_image
      FROM claims cl
      JOIN items i ON i.id = cl.item_id
      JOIN users u ON u.id = cl.claimant_id
      JOIN users owner ON owner.id = i.user_id
      WHERE cl.id = ?
    `, [req.params.id]);
    
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
    
    // Only allow claimant, item owner, or admin to view claim
    if (req.user.id !== claim.claimant_id && req.user.id !== claim.claimant_id && 
        !['admin', 'security'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }
    
    res.json({ success: true, data: claim });
  } catch (err) {
    console.error('Get claim error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch claim' });
  }
};

// POST /api/claims/:id/verify-identity — submit identity verification
const submitIdentityVerification = async (req, res) => {
  try {
    const { identity_answers, identity_document_url } = req.body;
    
    const claim = await queryOne('SELECT * FROM claims WHERE id = ?', [req.params.id]);
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
    if (claim.claimant_id !== req.user.id) return res.status(403).json({ success: false, message: 'Permission denied' });
    
    if (claim.identity_verification_status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Identity verification already completed' });
    }

    const crypto = require('crypto');
    const answersHash = identity_answers ? crypto.createHash('sha256').update(identity_answers).digest('hex') : null;
    
    await query(
      'UPDATE claims SET identity_document_url = ?, verification_answers_hash = ? WHERE id = ?',
      [identity_document_url || claim.identity_document_url, answersHash || claim.verification_answers_hash, req.params.id]
    );

    res.json({ success: true, message: 'Identity verification submitted. An admin will review shortly.' });
  } catch (err) {
    console.error('Identity verification error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit identity verification' });
  }
};

module.exports = { getItems, getItemById, createItem, updateItem, deleteItem, getStats, claimItem, getClaimById, submitIdentityVerification };
