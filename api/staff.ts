import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbHelpers } from '../lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Check for ID in query params (from middleware) or URL path
    const staffId = req.query?.id || (req.url?.split('/').filter(Boolean) || [])[req.url?.split('/').filter(Boolean).length - 1];
    

    switch (req.method) {
      case 'GET':
        if (staffId && staffId !== 'staff') {
          // Get specific staff member
          const staff = await dbHelpers.getStaffById(staffId);
          if (!staff) {
            return res.status(404).json({ error: 'Staff member not found' });
          }
          return res.json(staff);
        } else {
          // Get all staff - for demo, return mock data
          const staff = await dbHelpers.getStaff();
          return res.json(staff || []);
        }

      case 'POST':
        // For demo purposes, return mock success
        const newStaff = {
          id: `staff_${Date.now()}`,
          ...req.body,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return res.status(201).json(newStaff);

      case 'PUT':
        if (!staffId || staffId === 'staff') {
          return res.status(400).json({ error: 'Staff ID required for update' });
        }
        // Update staff member in database
        const updatedStaff = await dbHelpers.updateStaff(staffId, req.body);
        if (!updatedStaff) {
          return res.status(404).json({ error: 'Staff member not found' });
        }
        return res.json(updatedStaff);

      case 'DELETE':
        if (!staffId || staffId === 'staff') {
          return res.status(400).json({ error: 'Staff ID required for deletion' });
        }
        // For demo purposes, return success
        return res.status(200).json({ message: 'Staff deleted successfully' });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Staff API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}