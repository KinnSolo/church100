// Google Sheets Configuration
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxki5vlPmNEGIkCSL5VW8MNp1mueEETVl9EVcgY7mZBghVvjii2nbgZjVMjDTf6iriC/exec'; 

// Data Storage
let members = [];
let attendanceRecords = [];
let followUpRecords = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadDataFromSheets();
    updateTodayDay();
    
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput) dateInput.value = today;
});

// Show sheet
function showSheet(sheetId) {
    document.querySelectorAll('.sheet').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    
    const sheet = document.getElementById(sheetId);
    if (sheet) sheet.classList.add('active');
    
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(sheetId.replace('-', ' '))) {
            btn.classList.add('active');
        }
    });
    
    if (sheetId === 'dashboard') updateDashboard();
}

// ===== LOAD DATA FROM GOOGLE SHEETS =====
async function loadDataFromSheets() {
    await loadMembers();
    await loadAttendance();
    await loadFollowUp();
}

async function loadMembers() {
    try {
        const response = await fetch(SHEETS_URL + '?action=getMembers');
        const data = await response.json();
        console.log('Raw members data:', data);
        
        members = data.filter(m => m.id && m.name);
        console.log('Filtered members:', members);
        
        renderMembersTable();
        populateMemberDropdown();
        updateDashboard();
    } catch (error) {
        console.error('Error loading members:', error);
        alert('Error loading members. Please check your internet connection.');
    }
}

async function loadAttendance() {
    try {
        const response = await fetch(SHEETS_URL + '?action=getAttendance');
        const data = await response.json();
        console.log('Raw attendance data:', data);
        
        attendanceRecords = data.filter(a => a.id && a.name);
        console.log('Filtered attendance:', attendanceRecords);
        
        renderAttendanceTable();
        renderMonthlySummary();
        updateDashboard();
    } catch (error) {
        console.error('Error loading attendance:', error);
        alert('Error loading attendance data. Check console for details.');
    }
}

async function loadFollowUp() {
    try {
        const response = await fetch(SHEETS_URL + '?action=getFollowUp');
        const data = await response.json();
        console.log('Raw follow-up data:', data);
        
        followUpRecords = data.filter(f => f.id && f.name);
        console.log('Filtered follow-up:', followUpRecords);
        
        renderFollowUpTable();
    } catch (error) {
        console.error('Error loading follow-up:', error);
    }
}

// ===== ADD MEMBER =====
async function addMember() {
    const name = document.getElementById('memberName').value.trim();
    const phone = document.getElementById('memberPhone').value.trim();
    
    if (!name || !phone) {
        alert('Please enter both name and phone');
        return;
    }

    const team = assignTeam();
    const memberId = 'member_' + Date.now();
    const member = { 
        id: memberId,
        name, 
        phone, 
        team, 
        dateAdded: new Date().toISOString() 
    };
    
    try {
        await fetch(SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'addMember', member })
        });
        
        await createFollowUpRecord(member);
        await loadMembers();
        
        document.getElementById('memberName').value = '';
        document.getElementById('memberPhone').value = '';
        alert('Member added successfully!');
    } catch (error) {
        alert('Error adding member: ' + error.message);
    }
}

function assignTeam() {
    const teams = ['Team A', 'Team B', 'Team C'];
    return teams[Math.floor(Math.random() * teams.length)];
}

async function createFollowUpRecord(member) {
    const callDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const visitDays = ['Wednesday', 'Thursday', 'Saturday'];
    const followUp = {
        id: member.id,
        name: member.name,
        phone: member.phone,
        team: member.team,
        callDay: callDays[Math.floor(Math.random() * callDays.length)],
        visitDay: visitDays[Math.floor(Math.random() * visitDays.length)],
        visitTime: '10:00 AM',
        status: 'Pending'
    };
    
    try {
        await fetch(SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'addFollowUp', followUp })
        });
        await loadFollowUp();
    } catch (error) {
        console.error('Error creating follow-up:', error);
    }
}

// ===== RECORD ATTENDANCE =====
async function recordAttendance() {
    const date = document.getElementById('attendanceDate').value;
    const memberName = document.getElementById('attendanceMember').value;
    const type = document.getElementById('visitorMember').value;
    
    if (!date || !memberName) {
        alert('Please select date and member');
        return;
    }

    let member = members.find(m => m.name === memberName);
    
    // If member not found and type is "Visitor", create a new member entry
    if (!member && type === 'Visitor') {
        const phone = prompt('Enter phone number for this visitor:');
        if (!phone || phone.trim() === '') {
            alert('Phone number is required to add a new visitor');
            return;
        }
        
        // Create new member for the visitor
        const team = assignTeam();
        const memberId = 'member_' + Date.now();
        const newMember = { 
            id: memberId,
            name: memberName, 
            phone: phone.trim(), 
            team, 
            dateAdded: new Date().toISOString() 
        };
        
        try {
            await fetch(SHEETS_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'addMember', member: newMember })
            });
            
            await createFollowUpRecord(newMember);
            await loadMembers();
            
            member = newMember;
        } catch (error) {
            alert('Error adding new member: ' + error.message);
            return;
        }
    } else if (!member) {
        alert('Member not found. Please add them in Main Entry first.');
        return;
    }

    const recordId = 'attendance_' + Date.now();
    const record = { 
        id: recordId,
        date, 
        name: member.name, 
        phone: member.phone, 
        team: member.team, 
        type,
        memberId: member.id
    };
    
    try {
        const response = await fetch(SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'addAttendance', record })
        });
        
        const result = await response.json();
        console.log('Add attendance result:', result);
        
        // Wait a moment for Google Sheets to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reload data to show new record
        await loadAttendance();
        await loadMembers();
        
        // Force re-render
        renderAttendanceTable();
        
        alert('Attendance recorded successfully! Check the attendance table below.');
        
        // Keep user on Sunday Report to see the result
        showSheet('sunday-report');
    } catch (error) {
        console.error('Full error:', error);
        alert('Error recording attendance: ' + error.message);
    }
}

// ===== DELETE =====
async function deleteMember(id) {
    if (!confirm('Delete this member?')) return;
    
    try {
        await fetch(SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteMember', id })
        });
        
        await fetch(SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteFollowUp', id })
        });
        
        // Delete related attendance records
        const relatedAttendance = attendanceRecords.filter(a => a.memberId === id);
        for (const record of relatedAttendance) {
            await fetch(SHEETS_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'deleteAttendance', id: record.id })
            });
        }
        
        await loadMembers();
        await loadAttendance();
        await loadFollowUp();
    } catch (error) {
        alert('Error deleting member: ' + error.message);
    }
}

async function deleteAttendance(id) {
    if (!confirm('Delete this attendance record?')) return;
    
    try {
        await fetch(SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteAttendance', id })
        });
        await loadAttendance();
    } catch (error) {
        alert('Error deleting attendance: ' + error.message);
    }
}

async function deleteFollowUp(id) {
    if (!confirm('Delete this follow-up record?')) return;
    
    try {
        await fetch(SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteFollowUp', id })
        });
        await loadFollowUp();
    } catch (error) {
        alert('Error deleting follow-up: ' + error.message);
    }
}

// ===== EDIT =====
async function editMember(id) {
    const m = members.find(x => x.id === id);
    if (!m) return;
    
    const newName = prompt('Edit Name:', m.name);
    if (newName === null || newName.trim() === '') return;
    const newPhone = prompt('Edit Phone:', m.phone);
    if (newPhone === null || newPhone.trim() === '') return;
    
    const oldName = m.name;
    const updatedMember = {
        ...m,
        name: newName.trim(),
        phone: newPhone.trim()
    };
    
    try {
        await fetch(SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'updateMember', id, member: updatedMember })
        });
        
        // Update follow-up record
        const followUp = followUpRecords.find(f => f.id === id);
        if (followUp) {
            await fetch(SHEETS_URL, {
                method: 'POST',
                body: JSON.stringify({ 
                    action: 'updateFollowUp', 
                    id, 
                    followUp: {
                        ...followUp,
                        name: newName.trim(),
                        phone: newPhone.trim()
                    }
                })
            });
        }
        
        // Update attendance records
        const relatedAttendance = attendanceRecords.filter(a => a.name === oldName);
        for (const record of relatedAttendance) {
            await fetch(SHEETS_URL, {
                method: 'POST',
                body: JSON.stringify({ 
                    action: 'updateAttendance', 
                    id: record.id, 
                    record: {
                        ...record,
                        name: newName.trim(),
                        phone: newPhone.trim()
                    }
                })
            });
        }
        
        await loadMembers();
        await loadFollowUp();
        await loadAttendance();
    } catch (error) {
        alert('Error editing member: ' + error.message);
    }
}

async function editAttendance(id) {
    const r = attendanceRecords.find(x => x.id === id);
    if (!r) return;
    
    const newDate = prompt('Edit Date (YYYY-MM-DD):', r.date);
    if (newDate === null) return;
    const newType = prompt('Edit Type (Visitor/Member):', r.type);
    if (newType === null) return;
    
    try {
        await fetch(SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'updateAttendance', 
                id, 
                record: { ...r, date: newDate, type: newType }
            })
        });
        await loadAttendance();
    } catch (error) {
        alert('Error editing attendance: ' + error.message);
    }
}

async function editFollowUp(id) {
    const f = followUpRecords.find(x => x.id === id);
    if (!f) return;
    
    const newDay = prompt('Edit Call Day:', f.callDay);
    if (newDay === null) return;
    const newVisit = prompt('Edit Visit Day:', f.visitDay);
    if (newVisit === null) return;
    const newTime = prompt('Edit Visit Time:', f.visitTime);
    if (newTime === null) return;
    
    try {
        await fetch(SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'updateFollowUp', 
                id, 
                followUp: { ...f, callDay: newDay, visitDay: newVisit, visitTime: newTime }
            })
        });
        await loadFollowUp();
    } catch (error) {
        alert('Error editing follow-up: ' + error.message);
    }
}

// ===== STATS =====
function countAttendance(name) {
    return attendanceRecords.filter(r => r.name === name).length;
}

function getMemberStatus(name) {
    const count = countAttendance(name);
    if (count < 3) return 'New';
    if (count < 8) return 'Growing';
    return 'Regular';
}

// Check if member is at-risk (missed 3+ Sundays)
function isAtRisk(memberName) {
    // Get all Sundays in the last 3 weeks
    const today = new Date();
    const threeWeeksAgo = new Date(today);
    threeWeeksAgo.setDate(today.getDate() - 21); // 3 weeks = 21 days
    
    // Get member's attendance records in the last 3 weeks
    const recentAttendance = attendanceRecords.filter(r => {
        const recordDate = new Date(r.date);
        return r.name === memberName && recordDate >= threeWeeksAgo;
    });
    
    // Count unique Sundays attended
    const sundaysAttended = new Set();
    recentAttendance.forEach(r => {
        const recordDate = new Date(r.date);
        // Only count Sundays
        if (recordDate.getDay() === 0) {
            sundaysAttended.add(r.date);
        }
    });
    
    // Count how many Sundays have passed in the last 3 weeks
    let sundaysPassed = 0;
    for (let d = new Date(threeWeeksAgo); d <= today; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0) sundaysPassed++;
    }
    
    // If 3+ Sundays have passed and member attended less than 1, they're at-risk
    const sundaysMissed = sundaysPassed - sundaysAttended.size;
    return sundaysMissed >= 3;
}

// ===== RENDER TABLES =====
function renderMembersTable() {
    const searchInput = document.getElementById('memberSearch');
    const filter = searchInput ? searchInput.value.toLowerCase() : '';
    const tbody = document.getElementById('membersTableBody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const filtered = members.filter(m => (
        m.name.toLowerCase().includes(filter) ||
        m.phone.toLowerCase().includes(filter) ||
        m.team.toLowerCase().includes(filter)
    ));
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No members found</td></tr>';
        return;
    }
    
    filtered.forEach(m => {
        const row = document.createElement('tr');
        const atRisk = isAtRisk(m.name);
        
        // Highlight at-risk members in red
        if (atRisk) {
            row.style.backgroundColor = '#ffebee';
            row.style.borderLeft = '4px solid #f44336';
        }
        
        row.innerHTML = `
            <td>${m.name}${atRisk ? ' ⚠️' : ''}</td>
            <td>${m.phone}</td>
            <td>${m.team}</td>
            <td>${countAttendance(m.name)}</td>
            <td>${atRisk ? '<span style="color: #f44336; font-weight: bold;">At Risk</span>' : getMemberStatus(m.name)}</td>
            <td>
                <button class="edit-btn" onclick="editMember('${m.id}')">✏️ Edit</button>
                <button class="delete-btn" onclick="deleteMember('${m.id}')">🗑️ Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderAttendanceTable() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Sort by date (newest first)
    const sortedRecords = [...attendanceRecords].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    if (sortedRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No attendance records yet. Add members and record their attendance.</td></tr>';
        return;
    }
    
    sortedRecords.forEach(r => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${r.date || 'N/A'}</td>
            <td>${r.name || 'N/A'}</td>
            <td>${r.phone || 'N/A'}</td>
            <td>${r.team || 'N/A'}</td>
            <td>${r.type || 'N/A'}</td>
            <td>${countAttendance(r.name)}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderFollowUpTable() {
    const tbody = document.getElementById('followUpTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    
    if (followUpRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No follow-up records yet</td></tr>';
        return;
    }
    
    followUpRecords.forEach(f => {
        const row = document.createElement('tr');
        const isToday = f.callDay === today || f.visitDay === today;
        const atRisk = isAtRisk(f.name);
        
        // Priority: At-risk takes precedence over today's follow-up
        if (atRisk) {
            row.style.backgroundColor = '#ffebee';
            row.style.borderLeft = '4px solid #f44336';
        } else if (isToday) {
            row.style.backgroundColor = '#e3f2fd';
        }
        
        row.innerHTML = `
            <td>${f.name}${atRisk ? ' ⚠️' : ''}</td>
            <td>${f.phone}</td>
            <td>${f.team}</td>
            <td>${f.callDay}</td>
            <td>${f.visitDay}</td>
            <td>${f.visitTime}</td>
            <td>${atRisk ? '<span style="color: #f44336; font-weight: bold;">At Risk - Urgent!</span>' : f.status}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderMonthlySummary() {
    const tbody = document.getElementById('summaryTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const monthlyData = {};
    
    // Track unique members (souls won) - only count MEMBERS, not visitors
    const uniqueMembers = new Set();
    
    attendanceRecords.forEach(r => {
        const month = r.date.substring(0, 7);
        if (!monthlyData[month]) {
            monthlyData[month] = { souls: 0, visitors: 0, total: 0 };
        }
        monthlyData[month].total++;
        
        if (r.type === 'Visitor') {
            // Visitors only count as visitors, NOT souls won
            monthlyData[month].visitors++;
        } else {
            // Only Members count as souls won
            // Track unique members per month
            const key = month + '_' + r.name;
            if (!uniqueMembers.has(key)) {
                uniqueMembers.add(key);
                monthlyData[month].souls++;
            }
        }
    });
    
    const sortedMonths = Object.keys(monthlyData).sort();
    
    if (sortedMonths.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No monthly data yet</td></tr>';
        return;
    }
    
    sortedMonths.forEach(month => {
        const data = monthlyData[month];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${month}</td>
            <td>${data.souls}</td>
            <td>${data.visitors}</td>
            <td>${data.total}</td>
        `;
        tbody.appendChild(row);
    });
}

// ===== MISC =====
function updateTodayDay() {
    const elem = document.getElementById('todayDay');
    if (elem) {
        elem.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    }
}

function populateMemberDropdown() {
    const select = document.getElementById('attendanceMember');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Member</option>';
    members.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.name;
        opt.textContent = m.name;
        select.appendChild(opt);
    });
}

function updateDashboard() {
    const totalMembersElem = document.getElementById('totalMembers');
    const goalProgressElem = document.getElementById('goalProgress');
    const totalVisitorsElem = document.getElementById('totalVisitors');
    const totalAttendanceElem = document.getElementById('totalAttendance');
    const progressFillElem = document.getElementById('progressFill');
    const progressTextElem = document.getElementById('progressText');
    
    const totalMembers = members.length;
    const goalProgress = Math.round((totalMembers / 100) * 100);
    const totalVisitors = attendanceRecords.filter(r => r.type === 'Visitor').length;
    const totalAttendance = attendanceRecords.length;
    
    // Count at-risk members
    const atRiskCount = members.filter(m => isAtRisk(m.name)).length;
    
    if (totalMembersElem) totalMembersElem.textContent = totalMembers;
    if (goalProgressElem) goalProgressElem.textContent = goalProgress + '%';
    if (totalVisitorsElem) totalVisitorsElem.textContent = totalVisitors;
    if (totalAttendanceElem) totalAttendanceElem.textContent = totalAttendance;
    
    if (progressFillElem) {
        progressFillElem.style.width = goalProgress + '%';
    }
    if (progressTextElem) {
        progressTextElem.textContent = totalMembers + ' / 100';
    }
    
    const teamCounts = { 'Team A': 0, 'Team B': 0, 'Team C': 0 };
    members.forEach(m => {
        if (teamCounts[m.team] !== undefined) teamCounts[m.team]++;
    });
    
    const teamAElem = document.getElementById('teamACount');
    const teamBElem = document.getElementById('teamBCount');
    const teamCElem = document.getElementById('teamCCount');
    
    if (teamAElem) teamAElem.textContent = teamCounts['Team A'];
    if (teamBElem) teamBElem.textContent = teamCounts['Team B'];
    if (teamCElem) teamCElem.textContent = teamCounts['Team C'];
    
    // Show at-risk alert on dashboard if there are any
    showAtRiskAlert(atRiskCount);
}

function showAtRiskAlert(count) {
    // Check if alert already exists
    let alertBox = document.getElementById('atRiskAlert');
    
    if (count > 0) {
        if (!alertBox) {
            // Create alert box if it doesn't exist
            alertBox = document.createElement('div');
            alertBox.id = 'atRiskAlert';
            alertBox.style.cssText = `
                background-color: #ffebee;
                border: 2px solid #f44336;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                color: #c62828;
                font-weight: bold;
                text-align: center;
            `;
            
            // Insert at the top of dashboard
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.insertBefore(alertBox, dashboard.firstChild);
            }
        }
        alertBox.innerHTML = `⚠️ ALERT: ${count} member${count > 1 ? 's' : ''} at risk (missed 3+ Sundays). Check Main Entry and Follow-Up Tracker!`;
        alertBox.style.display = 'block';
    } else {
        if (alertBox) {
            alertBox.style.display = 'none';
        }
    }
}

function filterMembers() {
    renderMembersTable();
}