const bcrypt = require('bcryptjs');
const { User } = require('../models');

const userData = [
  {
    username: 'admin001',
    email: 'admin@jobportal.com',
    password: 'admin123456',
    role: 'admin',
    phone: '+84901234567',
    full_name: 'Admin User',
    first_name: 'Admin',
    last_name: 'User',
    is_verified: true,
    is_active: true,
    account_status: 'approved'
  },
  {
    username: 'candidate001',
    email: 'candidate1@example.com',
    password: 'candidate123',
    role: 'candidate',
    phone: '+84901234568',
    full_name: 'Nguyễn Văn A',
    first_name: 'Văn A',
    last_name: 'Nguyễn',
    is_verified: true,
    is_active: true,
    account_status: 'approved'
  },
  {
    username: 'candidate002',
    email: 'candidate2@example.com',
    password: 'candidate123',
    role: 'candidate',
    phone: '+84901234569',
    full_name: 'Trần Thị B',
    first_name: 'Thị B',
    last_name: 'Trần',
    is_verified: true,
    is_active: true,
    account_status: 'approved'
  },
  {
    username: 'candidate003',
    email: 'candidate3@example.com',
    password: 'candidate123',
    role: 'candidate',
    phone: '+84901234570',
    full_name: 'Lê Minh C',
    first_name: 'Minh C',
    last_name: 'Lê',
    is_verified: true,
    is_active: true,
    account_status: 'approved'
  },
  {
    username: 'recruiter001',
    email: 'recruiter1@company.com',
    password: 'recruiter123',
    role: 'recruiter',
    phone: '+84901234571',
    full_name: 'Phạm Văn D',
    first_name: 'Văn D',
    last_name: 'Phạm',
    is_verified: true,
    is_active: true,
    account_status: 'approved'
  },
  {
    username: 'recruiter002',
    email: 'recruiter2@techcorp.com',
    password: 'recruiter123',
    role: 'recruiter',
    phone: '+84901234572',
    full_name: 'Hoàng Thị E',
    first_name: 'Thị E',
    last_name: 'Hoàng',
    is_verified: true,
    is_active: true,
    account_status: 'approved'
  },
  {
    username: 'recruiter003',
    email: 'recruiter3@startup.com',
    password: 'recruiter123',
    role: 'recruiter',
    phone: '+84901234573',
    full_name: 'Vũ Minh F',
    first_name: 'Minh F',
    last_name: 'Vũ',
    is_verified: true,
    is_active: true,
    account_status: 'approved'
  }
];

async function seedUsers() {
  try {
    console.log('Seeding users...');
    
    // Hash passwords before saving
    for (let user of userData) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
    
    const users = await User.insertMany(userData);
    console.log(`Created ${users.length} users`);
    
    return users;
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

module.exports = seedUsers;
