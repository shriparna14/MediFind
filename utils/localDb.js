const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class LocalCollection {
  constructor(name) {
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this.name = name;
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2));
    }
  }

  _read() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${this.name} JSON file:`, error);
      return [];
    }
  }

  _write(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing ${this.name} JSON file:`, error);
      return false;
    }
  }

  async find(filter = {}) {
    const data = this._read();
    return data.filter(item => {
      for (const key in filter) {
        // Simple regex support for text search
        if (filter[key] instanceof RegExp) {
          if (!filter[key].test(item[key] || '')) return false;
        } else if (typeof filter[key] === 'object' && filter[key] !== null) {
          // Handle operator searches like $lt, $gt, $in, $ne
          const operators = filter[key];
          for (const op in operators) {
            const val = operators[op];
            if (op === '$in') {
              if (!Array.isArray(val) || !val.includes(item[key])) return false;
            } else if (op === '$nin') {
              if (Array.isArray(val) && val.includes(item[key])) return false;
            } else if (op === '$gt') {
              if (!(item[key] > val)) return false;
            } else if (op === '$gte') {
              if (!(item[key] >= val)) return false;
            } else if (op === '$lt') {
              if (!(item[key] < val)) return false;
            } else if (op === '$lte') {
              if (!(item[key] <= val)) return false;
            } else if (op === '$ne') {
              if (item[key] === val) return false;
            } else if (op === '$regex') {
              const regex = val instanceof RegExp ? val : new RegExp(val, 'i');
              if (!regex.test(item[key] || '')) return false;
            }
          }
        } else {
          // Check simple equality
          if (item[key] !== filter[key]) return false;
        }
      }
      return true;
    });
  }

  async findOne(filter = {}) {
    const items = await this.find(filter);
    return items.length > 0 ? items[0] : null;
  }

  async findById(id) {
    const items = this._read();
    return items.find(item => item._id === id || String(item._id) === String(id)) || null;
  }

  async create(doc) {
    const items = this._read();
    const newDoc = {
      _id: doc._id || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...doc
    };
    items.push(newDoc);
    this._write(items);
    return newDoc;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const items = this._read();
    const index = items.findIndex(item => item._id === id || String(item._id) === String(id));
    if (index === -1) return null;

    const currentDoc = items[index];
    
    // Process Mongoose-like $set, $inc, etc. if they are used, otherwise merge simple updates
    let updatedDoc = { ...currentDoc, updatedAt: new Date().toISOString() };
    
    if (update.$set) {
      updatedDoc = { ...updatedDoc, ...update.$set };
    } else if (update.$inc) {
      for (const key in update.$inc) {
        updatedDoc[key] = (updatedDoc[key] || 0) + update.$inc[key];
      }
    } else {
      updatedDoc = { ...updatedDoc, ...update };
    }

    items[index] = updatedDoc;
    this._write(items);
    return options.new ? updatedDoc : currentDoc;
  }

  async findByIdAndDelete(id) {
    const items = this._read();
    const index = items.findIndex(item => item._id === id || String(item._id) === String(id));
    if (index === -1) return null;
    const deleted = items.splice(index, 1)[0];
    this._write(items);
    return deleted;
  }

  async deleteOne(filter = {}) {
    const items = this._read();
    const index = items.findIndex(item => {
      for (const key in filter) {
        if (item[key] !== filter[key]) return false;
      }
      return true;
    });
    if (index === -1) return false;
    items.splice(index, 1);
    this._write(items);
    return true;
  }

  async countDocuments(filter = {}) {
    const items = await this.find(filter);
    return items.length;
  }
}

module.exports = {
  User: new LocalCollection('users'),
  Medicine: new LocalCollection('medicines'),
  Reservation: new LocalCollection('reservations'),
  Order: new LocalCollection('orders'),
  Prescription: new LocalCollection('prescriptions'),
  SearchLog: new LocalCollection('searchlogs')
};
