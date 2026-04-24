
export class DatabaseService {
  async init(): Promise<void> {
    // No initialization needed for backend API
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const response = await fetch(`/api/${storeName}`);
    if (!response.ok) throw new Error(`Failed to fetch ${storeName}`);
    return response.json();
  }

  async add<T>(storeName: string, item: T): Promise<void> {
    const response = await fetch(`/api/${storeName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error(`Failed to add to ${storeName}`);
  }

  async put<T>(storeName: string, item: T): Promise<void> {
    const id = (item as any).id;
    const response = await fetch(`/api/${storeName}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error(`Failed to update ${storeName}`);
  }

  async delete(storeName: string, id: string): Promise<void> {
    const response = await fetch(`/api/${storeName}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Failed to delete from ${storeName}`);
  }

  async deleteTransfersByFile(fileId: string): Promise<void> {
    const response = await fetch(`/api/transfers/file/${fileId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Failed to delete transfers for file ${fileId}`);
  }

  async clearAll(): Promise<void> {
    const response = await fetch('/api/clear', {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to clear database');
  }
}

export const dbService = new DatabaseService();
