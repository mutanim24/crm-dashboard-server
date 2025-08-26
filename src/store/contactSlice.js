import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunk for creating a contact
export const createContact = createAsyncThunk(
  'contacts/createContact',
  async (contactData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/v1/contacts', contactData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Contact slice
const contactSlice = createSlice({
  name: 'contacts',
  initialState: {
    contacts: [], // Ensure contacts is initialized as an empty array
    loading: false,
    error: null,
  },
  reducers: {
    // You can add synchronous reducers here if needed
  },
  extraReducers: (builder) => {
    builder
      .addCase(createContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createContact.fulfilled, (state, action) => {
        state.loading = false;
        // Fix: Use immutable update pattern instead of mutating state
        state.contacts = [...state.contacts, action.payload.data];
      })
      .addCase(createContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default contactSlice.reducer;
