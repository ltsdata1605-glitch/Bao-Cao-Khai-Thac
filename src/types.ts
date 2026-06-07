export interface PriceWarStats {
  tc: string;  // Thành công (CE/ICT)
  ss: string;  // So giá
  ch: string;  // Chiến
  bo: string;  // Bỏ về
  xtt: string; // Xin thông tin
}

export interface LeadInfo {
  id: string;
  name: string;
  phone: string;
  product: string;
  status: 'Chưa liên hệ' | 'Đã liên hệ' | 'Đã chốt' | 'Khách tham khảo' | 'Khách đã mua' | 'Tham khảo' | 'Từ chối';
  statusDetails?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ReportState {
  staffName: string;
  cash: string;
  installment: string;
  moVi: boolean;
  showPriceWar: boolean;
  products: {
    tivi: number;
    tuLanh: number;
    mayGiat: number;
    mayLanh: number;
    smpTab: number;
    laptop: number;
    otherName: string;
    otherCount: number;
  };
  household: {
    mln: number;
    qdh: number;
    quat: number;
    noiCom: number;
    noiChien: number;
    locKk: number;
    otherName: string;
    otherCount: number;
  };
  services: {
    vi: string;
    vieon: number;
    sim: number;
    dongHo: number;
    insurance: string;
  };
  accessories: {
    camera: number;
    sdp: number;
    den: number;
    loa: number;
    otherName: string;
    otherCount: number;
  };
  priceWar: {
    ce: PriceWarStats;
    ict: PriceWarStats;
  };
  leads: LeadInfo[];
  notes: string;
}

export interface SavedTotals {
  cash: number;
  installment: number;
  insurance: number;
  maintenance: number;
  lastUpdatedAt?: string;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  status: 'success' | 'error';
  message: string;
}
