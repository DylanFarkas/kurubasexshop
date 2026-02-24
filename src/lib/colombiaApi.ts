const API_BASE = 'https://api-colombia.com/api/v1';

export interface Department {
  id: number;
  name: string;
  description?: string;
}

export interface City {
  id: number;
  name: string;
  description?: string;
}

/**
 * Obtener todos los departamentos de Colombia
 */
export async function getDepartments(): Promise<Department[]> {
  try {
    const res = await fetch(`${API_BASE}/Department`);
    if (!res.ok) throw new Error('Error al cargar departamentos');
    return await res.json();
  } catch (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
}

/**
 * Obtener ciudades de un departamento específico
 * @param departmentId - ID del departamento (ej: 5 para Antioquia)
 */
export async function getCitiesByDepartment(departmentId: number): Promise<City[]> {
  try {
    const res = await fetch(`${API_BASE}/Department/${departmentId}/cities`);
    if (!res.ok) throw new Error('Error al cargar ciudades');
    return await res.json();
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
}