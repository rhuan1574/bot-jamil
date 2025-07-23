const fs = require('fs').promises;
const path = require('path');

class ParceriasManager {
  constructor() {
    this.filePath = path.join(__dirname, '../database/parcerias.json');
  }

  async loadParcerias() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Se o arquivo não existir, criar com estrutura padrão
      const defaultData = { parcerias: [] };
      await this.saveParcerias(defaultData);
      return defaultData;
    }
  }

  async saveParcerias(data) {
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  async addParceria(parceria) {
    const data = await this.loadParcerias();
    data.parcerias.push(parceria);
    await this.saveParcerias(data);
  }

  async removeParceria(messageId) {
    const data = await this.loadParcerias();
    const index = data.parcerias.findIndex(p => p.messageId === messageId);
    if (index !== -1) {
      const removedParceria = data.parcerias.splice(index, 1)[0];
      await this.saveParcerias(data);
      return removedParceria;
    }
    return null;
  }

  async getParceria(messageId) {
    const data = await this.loadParcerias();
    return data.parcerias.find(p => p.messageId === messageId);
  }

  async getAllParcerias() {
    const data = await this.loadParcerias();
    return data.parcerias;
  }
}

module.exports = ParceriasManager; 