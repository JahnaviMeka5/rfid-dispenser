// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const { Types } = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- Mongoose Models ---
const patientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rfid: { type: String, required: true, unique: true },
    photo: { type: Buffer }, // store photo bytes
    photoMimeType: { type: String },
    medications: [{
        _id: false,
        id: { type: mongoose.Schema.Types.ObjectId, default: () => new Types.ObjectId() },
        name: String,
        dose: String,
        instructions: String,
        quantity: Number,
        addedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});
const Patient = mongoose.model('Patient', patientSchema);

const dispenseSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    rfid: String,
    medicationId: String,
    medicationName: String,
    adminUser: String,
    timestamp: { type: Date, default: Date.now },
    success: { type: Boolean, default: true },
    notes: String
});
const Dispense = mongoose.model('Dispense', dispenseSchema);

// --- Connect to MongoDB ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rfid-dispenser';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connect error', err);
        process.exit(1);
    });

// --- Routes ---

app.get('/', (req, res) => res.json({ ok: true, server: 'rfid-med-dispenser-backend', time: new Date() }));

// Register patient with photo (multipart/form-data)
app.post('/api/patients', upload.single('photo'), async(req, res) => {
    try {
        const { name, rfid } = req.body;
        if (!name || !rfid) return res.status(400).json({ error: 'name and rfid are required' });

        const existing = await Patient.findOne({ rfid });
        if (existing) return res.status(409).json({ error: 'RFID already registered' });

        const patient = new Patient({ name, rfid });
        if (req.file) {
            patient.photo = req.file.buffer;
            patient.photoMimeType = req.file.mimetype;
        }
        await patient.save();
        res.status(201).json({ message: 'Patient registered', patientId: patient._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});

// Get patient list (no photo bytes)
app.get('/api/patients', async(req, res) => {
    const patients = await Patient.find().select('-photo -photoMimeType');
    res.json(patients);
});

// Get patient (optionally include photo as base64 ?photo=true)
app.get('/api/patients/:id', async(req, res) => {
    try {
        const p = await Patient.findById(req.params.id);
        if (!p) return res.status(404).json({ error: 'not found' });

        if (req.query.photo === 'true' && p.photo && p.photoMimeType) {
            const b64 = p.photo.toString('base64');
            return res.json({
                _id: p._id,
                name: p.name,
                rfid: p.rfid,
                medications: p.medications,
                photo: `data:${p.photoMimeType};base64,${b64}`
            });
        }

        res.json({ _id: p._id, name: p.name, rfid: p.rfid, medications: p.medications, createdAt: p.createdAt });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});

// Login by RFID
app.post('/api/login', async(req, res) => {
    try {
        const { rfid } = req.body;
        if (!rfid) return res.status(400).json({ error: 'rfid required' });
        const p = await Patient.findOne({ rfid });
        if (!p) return res.status(404).json({ error: 'patient not found' });
        res.json({ _id: p._id, name: p.name, rfid: p.rfid, medications: p.medications });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});

// Add medication to patient
app.post('/api/patients/:id/medications', async(req, res) => {
    try {
        const { name, dose, instructions, quantity } = req.body;
        if (!name) return res.status(400).json({ error: 'medication name required' });
        const p = await Patient.findById(req.params.id);
        if (!p) return res.status(404).json({ error: 'patient not found' });
        const med = { name, dose: dose || '', instructions: instructions || '', quantity: Number(quantity) || 0 };
        p.medications.push(med);
        await p.save();
        res.json({ message: 'medication added', medications: p.medications });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});

// Remove medication
app.delete('/api/patients/:id/medications/:medId', async(req, res) => {
    try {
        const p = await Patient.findById(req.params.id);
        if (!p) return res.status(404).json({ error: 'patient not found' });
        p.medications = p.medications.filter(m => String(m.id) !== req.params.medId);
        await p.save();
        res.json({ message: 'medication removed', medications: p.medications });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});

// Record dispense event
app.post('/api/dispense', async(req, res) => {
    try {
        const { rfid, patientId, medicationId, medicationName, adminUser, notes } = req.body;
        let pid = patientId;
        if (!pid && rfid) {
            const p = await Patient.findOne({ rfid });
            if (p) pid = p._id;
        }
        const record = new Dispense({
            patientId: pid || null,
            rfid: rfid || null,
            medicationId: medicationId || null,
            medicationName: medicationName || null,
            adminUser: adminUser || null,
            notes: notes || null,
            success: true
        });
        await record.save();
        res.status(201).json({ message: 'dispense recorded', id: record._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});

// Dispense model was defined earlier - ensure we attach it (duplicate protective)
try {
    mongoose.model('Dispense');
} catch (e) {
    // ignore
}

app.get('/api/dispense', async(req, res) => {
    const { patientId, rfid } = req.query;
    const q = {};
    if (patientId) q.patientId = patientId;
    if (rfid) q.rfid = rfid;
    const rows = await Dispense.find(q).sort({ timestamp: -1 }).limit(500);
    res.json(rows);
});

// Serve photo quickly
app.get('/api/patients/:id/photo', async(req, res) => {
    try {
        const p = await Patient.findById(req.params.id);
        if (!p || !p.photo) return res.status(404).send('no photo');
        res.set('Content-Type', p.photoMimeType || 'image/jpeg');
        res.send(p.photo);
    } catch (err) {
        console.error(err);
        res.status(500).send('server error');
    }
});

// Update photo
app.put('/api/patients/:id/photo', upload.single('photo'), async(req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'photo file required' });
        const p = await Patient.findById(req.params.id);
        if (!p) return res.status(404).json({ error: 'patient not found' });
        p.photo = req.file.buffer;
        p.photoMimeType = req.file.mimetype;
        await p.save();
        res.json({ message: 'photo updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));