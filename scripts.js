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
        members = await response.json();
        members = members.filter(m => m.id); // Filter out empty rows
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
        attendanceRecords = await response.json();
        attendanceRecords = attendanceRecords.filter(a => a.id); // Filter out empty rows
        renderAttendanceTable();
        renderMonthlySummary();
        updateDashboard();
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

async function loadFollowUp() {
    try {
        const response = await fetch(SHEETS_URL + '?action=getFollowUp');
        followUpRecords = await response.json();
        followUpRecords = followUpRecords.filter(f => f.id); // Filter out empty rows
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

    const member = members.find(m => m.name === memberName);
    if (!member) {
        alert('Member not found');
        return;
    }

    const recordId = 'attendance_' + Date.now();
    const record = { 
        id: recordId,
        date, 
        name: memberName, 
        phone: member.phone, 
        team: member.team, 
        type,
        memberId: member.id
    };
    
    try {
        await fetch(SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'addAttendance', record })
        });
        
        await loadAttendance();
        alert('Attendance recorded successfully!');
    } catch (error) {
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
    
    filtered.forEach(m => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${m.name}</td>
            <td>${m.phone}</td>
            <td>${m.team}</td>
            <td>${countAttendance(m.name)}</td>
            <td>${getMemberStatus(m.name)}</td>
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
    
    attendanceRecords.forEach(r => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${r.date}</td>
            <td>${r.name}</td>
            <td>${r.phone}</td>
            <td>${r.team}</td>
            <td>${r.type}</td>
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
    
    followUpRecords.forEach(f => {
        const row = document.createElement('tr');
        const isToday = f.callDay === today || f.visitDay === today;
        if (isToday) row.style.backgroundColor = '#e3f2fd';
        
        row.innerHTML = `
            <td>${f.name}</td>
            <td>${f.phone}</td>
            <td>${f.team}</td>
            <td>${f.callDay}</td>
            <td>${f.visitDay}</td>
            <td>${f.visitTime}</td>
            <td>${f.status}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderMonthlySummary() {
    const tbody = document.getElementById('summaryTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const monthlyData = {};
    attendanceRecords.forEach(r => {
        const month = r.date.substring(0, 7);
        if (!monthlyData[month]) {
            monthlyData[month] = { souls: 0, visitors: 0, total: 0 };
        }
        monthlyData[month].total++;
        if (r.type === 'Visitor') monthlyData[month].visitors++;
        else monthlyData[month].souls++;
    });
    
    Object.keys(monthlyData).sort().forEach(month => {
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
}

function filterMembers() {
    renderMembersTable();
}