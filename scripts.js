// Data Storage
let members = [];
let attendanceRecords = [];
let followUpRecords = [];
let visitLogs = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    updateTodayDay();
    updateDashboard();
    populateMemberDropdown();

    // Attach search listeners
    document.getElementById('memberSearch').addEventListener('input', renderMembersTable);
    document.getElementById('attendanceSearch').addEventListener('input', renderAttendanceTable);
    document.getElementById('followUpSearch').addEventListener('input', renderFollowUpTable);
});

// Save data
function saveData() {
    localStorage.setItem('churchMembers', JSON.stringify(members));
    localStorage.setItem('churchAttendance', JSON.stringify(attendanceRecords));
    localStorage.setItem('churchFollowUp', JSON.stringify(followUpRecords));
    localStorage.setItem('churchVisitLogs', JSON.stringify(visitLogs));
}

// Load data
function loadData() {
    members = JSON.parse(localStorage.getItem('churchMembers') || '[]');
    attendanceRecords = JSON.parse(localStorage.getItem('churchAttendance') || '[]');
    followUpRecords = JSON.parse(localStorage.getItem('churchFollowUp') || '[]');
    visitLogs = JSON.parse(localStorage.getItem('churchVisitLogs') || '[]');

    renderMembersTable();
    renderAttendanceTable();
    renderFollowUpTable();
    renderMonthlySummary();
}

// Show sheet
function showSheet(sheetId, event) {
    document.querySelectorAll('.sheet').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.getElementById(sheetId).classList.add('active');
    if (event) event.target.classList.add('active');
    if (sheetId === 'dashboard') updateDashboard();
}

// ===== ADD MEMBER =====
function addMember() {
    const name = document.getElementById('memberName').value.trim();
    const phone = document.getElementById('memberPhone').value.trim();
    if (!name || !phone) return alert('Please enter both name and phone');

    const team = assignTeam();
    const member = { id: Date.now(), name, phone, team, dateAdded: new Date().toISOString() };
    members.push(member);
    createFollowUpRecord(member);

    document.getElementById('memberName').value = '';
    document.getElementById('memberPhone').value = '';
    saveData();
    renderMembersTable();
    populateMemberDropdown();
    updateDashboard();
}

// Assign random team
function assignTeam() {
    const teams = ['Team A', 'Team B', 'Team C'];
    return teams[Math.floor(Math.random() * teams.length)];
}

// Create follow-up
function createFollowUpRecord(member) {
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
    followUpRecords.push(followUp);
    renderFollowUpTable();
}

// ===== RECORD ATTENDANCE =====
function recordAttendance() {
    const date = document.getElementById('attendanceDate').value;
    const memberName = document.getElementById('attendanceMember').value;
    const type = document.getElementById('visitorMember').value;
    if (!date || !memberName) return alert('Select date and member');

    const member = members.find(m => m.name === memberName);
    if (!member) return alert('Member not found');

    const record = { id: Date.now(), date, name: memberName, phone: member.phone, team: member.team, type };
    attendanceRecords.push(record);

    saveData();
    renderAttendanceTable();
    renderMembersTable();
    renderMonthlySummary();
    updateDashboard();
}

// ===== DELETE =====
function deleteMember(id) {
    if (!confirm('Delete this member?')) return;
    members = members.filter(m => m.id !== id);
    followUpRecords = followUpRecords.filter(f => f.id !== id);
    attendanceRecords = attendanceRecords.filter(a => a.memberId !== id);
    saveData();
    renderMembersTable();
    renderFollowUpTable();
    renderAttendanceTable();
    populateMemberDropdown();
    updateDashboard();
}

function deleteAttendance(id) {
    if (!confirm('Delete this attendance record?')) return;
    attendanceRecords = attendanceRecords.filter(a => a.id !== id);
    saveData();
    renderAttendanceTable();
    renderMembersTable();
    renderMonthlySummary();
    updateDashboard();
}

function deleteFollowUp(id) {
    if (!confirm('Delete this follow-up record?')) return;
    followUpRecords = followUpRecords.filter(f => f.id !== id);
    saveData();
    renderFollowUpTable();
}

// ===== EDIT =====
function editMember(id) {
    const m = members.find(x => x.id === id);
    if (!m) return;
    const newName = prompt('Edit Name:', m.name);
    if (newName === null) return;
    const newPhone = prompt('Edit Phone:', m.phone);
    if (newPhone === null) return;
    m.name = newName.trim();
    m.phone = newPhone.trim();
    followUpRecords.forEach(f => { if (f.id === id) { f.name = m.name; f.phone = m.phone; } });
    attendanceRecords.forEach(a => { if (a.name === m.name) { a.phone = m.phone; } });
    saveData();
    renderMembersTable();
    renderFollowUpTable();
    renderAttendanceTable();
    populateMemberDropdown();
}

function editAttendance(id) {
    const r = attendanceRecords.find(x => x.id === id);
    if (!r) return;
    const newDate = prompt('Edit Date (YYYY-MM-DD):', r.date);
    if (newDate === null) return;
    const newType = prompt('Edit Type (Visitor/Member):', r.type);
    if (newType === null) return;
    r.date = newDate;
    r.type = newType;
    saveData();
    renderAttendanceTable();
    renderMonthlySummary();
    updateDashboard();
}

function editFollowUp(id) {
    const f = followUpRecords.find(x => x.id === id);
    if (!f) return;
    const newDay = prompt('Edit Call Day:', f.callDay);
    if (newDay === null) return;
    const newVisit = prompt('Edit Visit Day:', f.visitDay);
    if (newVisit === null) return;
    const newTime = prompt('Edit Visit Time:', f.visitTime);
    if (newTime === null) return;
    f.callDay = newDay;
    f.visitDay = newVisit;
    f.visitTime = newTime;
    saveData();
    renderFollowUpTable();
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
    const filter = document.getElementById('memberSearch').value.toLowerCase();
    const tbody = document.getElementById('membersTableBody');
    tbody.innerHTML = '';
    members.filter(m => (
        m.name.toLowerCase().includes(filter) ||
        m.phone.toLowerCase().includes(filter) ||
        m.team.toLowerCase().includes(filter)
    )).forEach(m => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${m.name}</td>
            <td>${m.phone}</td>
            <td>${m.team}</td>
            <td>${countAttendance(m.name)}</td>
            <td>${getMemberStatus(m.name)}</td>
            <td>
                <button class="edit-btn" onclick="editMember(${m.id})">✏️ Edit</button>
                <button class="delete-btn" onclick="deleteMember(${m.id})">🗑️ Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderAttendanceTable() {
    const filter = document.getElementById('attendanceSearch').value.toLowerCase();
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = '';
    attendanceRecords.filter(r => (
        r.name.toLowerCase().includes(filter) ||
        r.phone.toLowerCase().includes(filter) ||
        r.team.toLowerCase().includes(filter)
    )).forEach(r => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${r.date}</td>
            <td>${r.name}</td>
            <td>${r.phone}</td>
            <td>${r.team}</td>
            <td>${r.type}</td>
            <td>
                <button class="edit-btn" onclick="editAttendance(${r.id})">✏️</button>
                <button class="delete-btn" onclick="deleteAttendance(${r.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderFollowUpTable() {
    const filter = document.getElementById('followUpSearch').value.toLowerCase();
    const tbody = document.getElementById('followUpTableBody');
    tbody.innerHTML = '';
    followUpRecords.filter(f => (
        f.name.toLowerCase().includes(filter) ||
        f.phone.toLowerCase().includes(filter) ||
        f.team.toLowerCase().includes(filter)
    )).forEach(f => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${f.name}</td>
            <td>${f.phone}</td>
            <td>${f.team}</td>
            <td>${f.callDay}</td>
            <td>${f.visitDay}</td>
            <td>${f.visitTime}</td>
            <td>${f.status}</td>
            <td>
                <button class="edit-btn" onclick="editFollowUp(${f.id})">✏️</button>
                <button class="delete-btn" onclick="deleteFollowUp(${f.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ===== MISC =====
function updateTodayDay() {
    document.getElementById('todayDay').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

function populateMemberDropdown() {
    const select = document.getElementById('attendanceMember');
    select.innerHTML = '<option value="">Select Member</option>';
    members.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.name;
        opt.textContent = m.name;
        select.appendChild(opt);
    });
}

function updateDashboard() {
    document.getElementById('totalMembers').textContent = members.length;
}
function filterMembers() {
  const searchValue = document.getElementById("memberSearch").value.toLowerCase();
  const rows = document.querySelectorAll("#membersTableBody tr");

  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(searchValue) ? "" : "none";
  });
}
