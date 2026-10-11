const fs = require('fs');
const path = require('path');

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || !!process.env.VERCEL;
const SOURCE_DATA_DIR = path.join(__dirname, '..', '.data');
const DATA_DIR = isVercel ? path.join('/tmp', '.data') : SOURCE_DATA_DIR;

// Ensure data directory exists and seed initial data on Vercel
if (isVercel) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(SOURCE_DATA_DIR)) {
    try {
      const files = fs.readdirSync(SOURCE_DATA_DIR);
      files.forEach(f => {
        const dest = path.join(DATA_DIR, f);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(SOURCE_DATA_DIR, f), dest);
        }
      });
    } catch (err) {
      console.error('Error seeding /tmp/.data:', err.message);
    }
  }
} else if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to read and write JSON files
const readFile = (filename) => {
  const filepath = path.join(DATA_DIR, `${filename}.json`);
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify([], null, 2));
    return [];
  }
  try {
    let data = fs.readFileSync(filepath, 'utf8');
    // Sanitize single unescaped Windows backslashes (e.g. C:\Users) before parsing
    data = data.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading database file ${filename}:`, err.message);
    // Auto-heal corrupt JSON file
    fs.writeFileSync(filepath, JSON.stringify([], null, 2));
    return [];
  }
};

const writeFile = (filename, data) => {
  const filepath = path.join(DATA_DIR, `${filename}.json`);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
};

// Generate random mock IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

class MockQuery {
  constructor(data) {
    this._data = data;
  }

  sort(sortObj) {
    if (!sortObj) return this;
    const fields = Object.keys(sortObj);
    this._data.sort((a, b) => {
      for (const field of fields) {
        const order = sortObj[field];
        if (a[field] < b[field]) return order === -1 ? 1 : -1;
        if (a[field] > b[field]) return order === -1 ? -1 : 1;
      }
      return 0;
    });
    return this;
  }

  limit(num) {
    this._data = this._data.slice(0, num);
    return this;
  }

  // To support awaiting the query directly
  then(onfulfilled, onrejected) {
    return Promise.resolve(this._data).then(onfulfilled, onrejected);
  }
}

class MockModel {
  constructor(name, schema) {
    this.name = name.toLowerCase() + 's'; // simple pluralization
    this.schema = schema;
  }

  find(query = {}) {
    let records = readFile(this.name);
    
    // Helper to evaluate a single field condition
    const matchField = (itemVal, targetVal) => {
      if (targetVal === undefined) return true;
      if (targetVal && targetVal.$regex) {
        const pattern = targetVal.$regex instanceof RegExp ? targetVal.$regex : new RegExp(targetVal.$regex, targetVal.$options || 'i');
        return pattern.test(itemVal || '');
      }
      if (targetVal instanceof RegExp) {
        return targetVal.test(itemVal || '');
      }
      if (targetVal && typeof targetVal === 'object' && targetVal.$in) {
        return targetVal.$in.includes(itemVal);
      }
      if (typeof targetVal === 'string' && typeof itemVal === 'string') {
        return itemVal.toLowerCase() === targetVal.toLowerCase();
      }
      return itemVal === targetVal;
    };

    records = records.filter(item => {
      // Handle $or top-level condition
      if (query.$or && Array.isArray(query.$or)) {
        const matchesOr = query.$or.some(subQuery => {
          for (const k in subQuery) {
            if (!matchField(item[k], subQuery[k])) return false;
          }
          return true;
        });
        if (!matchesOr) return false;
      }

      for (const key in query) {
        if (key === '$or') continue;
        if (!matchField(item[key], query[key])) {
          return false;
        }
      }
      return true;
    });
    
    records = records.map(item => this._attachMethods(item));
    return new MockQuery(records);
  }

  _attachMethods(item) {
    if (!item || typeof item !== 'object') return item;
    const modelName = this.name;
    if (!item.save) {
      Object.defineProperty(item, 'save', {
        enumerable: false,
        configurable: true,
        writable: true,
        value: async function() {
          const records = readFile(modelName);
          const index = records.findIndex(r => r._id === this._id);
          this.updatedAt = new Date().toISOString();
          const clone = { ...this };
          delete clone.save;
          if (index !== -1) {
            records[index] = clone;
          } else {
            records.push(clone);
          }
          writeFile(modelName, records);
          return this;
        }
      });
    }
    return item;
  }

  async findOne(query = {}) {
    const q = this.find(query);
    return q._data[0] ? this._attachMethods(q._data[0]) : null;
  }

  async findById(id) {
    const records = readFile(this.name);
    const item = records.find(i => i._id === id);
    return item ? this._attachMethods(item) : null;
  }

  async create(data) {
    const records = readFile(this.name);
    const items = Array.isArray(data) ? data : [data];
    const createdItems = [];

    for (const item of items) {
      const newItem = {
        _id: generateId(),
        ...item,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this._attachMethods(newItem);
      records.push(newItem);
      createdItems.push(newItem);
    }

    writeFile(this.name, records);
    return Array.isArray(data) ? createdItems : createdItems[0];
  }

  async insertMany(dataArray) {
    return this.create(dataArray);
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const records = readFile(this.name);
    const index = records.findIndex(item => item._id === id);
    if (index === -1) return null;

    const currentItem = records[index];
    const updatedFields = update.$set || update;
    const updatedItem = {
      ...currentItem,
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    records[index] = updatedItem;
    writeFile(this.name, records);
    return options.new ? updatedItem : currentItem;
  }

  async updateOne(query, update) {
    const records = readFile(this.name);
    
    // Find first match
    const itemIndex = records.findIndex(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });

    if (itemIndex === -1) return { nModified: 0 };
    
    const updatedFields = update.$set || update;
    records[itemIndex] = {
      ...records[itemIndex],
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    writeFile(this.name, records);
    return { nModified: 1 };
  }

  async deleteMany(query = {}) {
    let records = readFile(this.name);
    const initialLength = records.length;
    
    records = records.filter(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return true; // keep if it doesn't match
      }
      return false; // delete if it matches
    });

    writeFile(this.name, records);
    return { deletedCount: initialLength - records.length };
  }

  async deleteOne(query = {}) {
    const records = readFile(this.name);
    const index = records.findIndex(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });

    if (index === -1) return { deletedCount: 0 };
    records.splice(index, 1);
    writeFile(this.name, records);
    return { deletedCount: 1 };
  }

  async countDocuments(query = {}) {
    const records = await this.find(query);
    return records.length;
  }
}

// Simple schema class
class Schema {
  constructor(definition, options) {
    this.definition = definition;
    this.options = options;
  }
}

module.exports = {
  Schema,
  model: (name, schema) => new MockModel(name, schema),
  readFile,
  writeFile
};
