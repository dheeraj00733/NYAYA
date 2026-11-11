import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  ChevronLeft, 
  Download, 
  Sparkles, 
  Scale, 
  MessageSquare, 
  CheckCircle, 
  Check, 
  AlertCircle,
  ExternalLink,
  BookOpen,
  Send,
  Layers
} from 'lucide-react';
import { api } from '../api/client';
import Badge from '../components/Badge';
import { useNotification } from '../context/NotificationContext';