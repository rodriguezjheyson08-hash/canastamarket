/*
 * MAPA DEL ARCHIVO: PANTALLA FRONTEND
 * UBICACION: pos-frontend/src/pages/04-CategoriasPage.tsx
 * QUE HACE: Contiene estructura visible de una pagina, estados de React y llamadas a servicios.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Box,
  Alert,
  Snackbar
} from '@mui/material';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import { Add, Edit, Delete } from '@mui/icons-material';
import { Categoria } from '../types';
import CategoriaForm from '../components/forms/CategoriaForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  createCategoria,
  deleteCategoria,
  getCategorias,
  getProductos,
  updateCategoria
} from '../services/api';
import { useI18n } from '../hooks/useI18n';

const CategoriasPage: React.FC = () => {
  const { t } = useI18n();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | undefined>();
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const fetchCategorias = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCategorias();
      setCategorias(data);
    } catch (error) {
      setCategorias([]);
      showSnackbar(t('Error al cargar categorías', 'Error loading categories'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, t]);

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

// LOGICA: handle Create concentra una operacion de este archivo.
  const handleCreate = () => {
    setEditingCategoria(undefined);
    setFormOpen(true);
  };

// LOGICA: handle Edit concentra una operacion de este archivo.
  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setFormOpen(true);
  };

// LOGICA: handle Delete concentra una operacion de este archivo.
  const handleDelete = async (id: number) => {
    try {
      const productos = await getProductos();
      const tieneProductos = productos.some((p: any) => p.categoriaId === id);
      if (tieneProductos) {
        showSnackbar(t('No se puede eliminar la categoría porque tiene productos asociados.', 'Cannot delete the category because it has associated products.'), 'error');
        return;
      }
      if (!window.confirm(t('¿Estás seguro de que quieres eliminar esta categoría?', 'Are you sure you want to delete this category?'))) return;
      await deleteCategoria(id);
      setCategorias(prev => prev.filter(c => c.id !== id));
      showSnackbar(t('Categoría eliminada exitosamente', 'Category deleted successfully'), 'success');
    } catch (error) {
      showSnackbar(t('Error al eliminar categoría', 'Error deleting category'), 'error');
    }
  };

// LOGICA: handle Submit concentra una operacion de este archivo.
  const handleSubmit = async (categoriaData: Omit<Categoria, 'id'>) => {
    setSaving(true);
    try {
      if (editingCategoria) {
        const actualizada = await updateCategoria(editingCategoria.id, categoriaData);
        setCategorias(prev => prev.map(c => (c.id === editingCategoria.id ? actualizada : c)));
        showSnackbar(t('Categoría actualizada exitosamente', 'Category updated successfully'), 'success');
      } else {
        const creada = await createCategoria(categoriaData);
        setCategorias(prev => [...prev, creada]);
        showSnackbar(t('Categoría creada exitosamente', 'Category created successfully'), 'success');
      }
      setFormOpen(false);
    } catch (error) {
      showSnackbar(t('Error al guardar categoría', 'Error saving category'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          {t('Gestión de Categorías', 'Category Management')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreate}
        >
          {t('Nueva Categoría', 'New Category')}
        </Button>
      </Box>

      {categorias.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('No hay categorías registradas', 'No categories registered')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('Comienza agregando tu primera categoría', 'Start by adding your first category')}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('Nombre', 'Name')}</TableCell>
                <TableCell>{t('Descripción', 'Description')}</TableCell>
                <TableCell align="center">{t('Acciones', 'Actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categorias.map((categoria) => (
                <TableRow key={categoria.id}>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {categoria.nombre}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {categoria.descripcion || t('Sin descripción', 'No description')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(categoria)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(categoria.id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CategoriaForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        categoria={editingCategoria}
        loading={saving}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CategoriasPage; 
