import { create } from 'zustand'

interface DropdownlistData {
  sites?: any[];
  departments?: any[];
  clients?: any[];
  vehicles?: any[];
  locations?: any[];
  driver_roles?: any[];
  masterdrivers?: any[];
  mastercauses?: any[];
  provinces?: any[];
  districts?: any[];
  subdistricts?: any[];
}

interface DropdownlistStore extends DropdownlistData {
  isLoading: boolean;
  lastUpdated?: string;
  error?: string;
  fetchDropdownData: () => Promise<void>;
  clearData: () => void;
  setData: (data: Partial<DropdownlistData>) => void;
  getData: () => DropdownlistData;
}

export const useDropdownStore = create<DropdownlistStore>((set, get) => ({
  // Initial state
  sites: [],
  departments: [],
  clients: [],
  vehicles: [],
  locations: [],
  driver_roles: [],
  masterdrivers: [],
  mastercauses: [],
  provinces: [],
  districts: [],
  subdistricts: [],
  isLoading: false,
  lastUpdated: undefined,
  error: undefined,

  // Actions
  fetchDropdownData: async () => {
    const state = get();
    const hasData = state.sites && state.sites.length > 0;
    console.log('state : ', state.lastUpdated);
    if (hasData && state.lastUpdated) {
      console.log('ข้อมูล dropdown มีอยู่แล้ว ไม่ต้องดึงใหม่');
      return;
    }

    set({ isLoading: true, error: undefined });

    const list_api = [
      "/sites",
      "/departments",
      "/clients",
      "/vehicles",
      "/locations",
      "/driver_roles",
      "/masterdrivers",
      "/mastercauses",
      "/provinces",
      "/districts",
      "/sub-districts"
    ];
    try {
      const authToken = localStorage.getItem('authToken');

      if (!authToken) {
        alert('ไม่พบการยืนยันตัวตน กรุณาเข้าสู่ระบบใหม่');
        window.location.href = '/login';
        throw new Error('ไม่พบ Token การยืนยันตัวตน');
      }
      async function parallelBatches(list: string[], batchSize: number, token: string) {
        const result = [];

        for (let i = 0; i < list.length; i += batchSize) {
          const batch = list.slice(i, i + batchSize);

          const res = await Promise.all(
            batch.map((api) =>
              fetch("/api/list", {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`,
                  "X-Api-Path": api,
                },
              }).then((r) => r.json())
            )
          );

          result.push(...res);
        }

        return result;
      }

      const data = await parallelBatches(list_api, 3, authToken);
      const dropdownObj: DropdownlistData = {};
      list_api.forEach((api, index) => {
        let key = api.substring(1);
        let sortedData = data[index];

        // Sort data based on the type
        if (Array.isArray(sortedData)) {
          switch (key) {
            case "sites":
              sortedData = sortedData.sort((a, b) => (a.site_name_th || '').localeCompare(b.site_name_th || ''));
              break;
            case "departments":
              sortedData = sortedData.sort((a, b) => (a.department_name_th || '').localeCompare(b.department_name_th || ''));
              break;
            case "clients":
              sortedData = sortedData.sort((a, b) => (a.client_name || '').localeCompare(b.client_name || ''));
              break;
            case "vehicles":
              sortedData = sortedData.sort((a, b) => (a.vehicle_number_plate || '').localeCompare(b.vehicle_number_plate || ''));
              break;
            case "locations":
              sortedData = sortedData.sort((a, b) => (a.location_name || '').localeCompare(b.location_name || ''));
              break;
            case "driver_roles":
              sortedData = sortedData.sort((a, b) => (a.role_name || '').localeCompare(b.role_name || ''));
              break;
            case "masterdrivers":
              sortedData = sortedData.sort((a, b) => {
                const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
                const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
                return nameA.localeCompare(nameB);
              });
              break;
            case "mastercauses":
              sortedData = sortedData.sort((a, b) => (a.cause_name || '').localeCompare(b.cause_name || ''));
              break;
            case "provinces":
              sortedData = sortedData.sort((a, b) => (a.province_name_th || '').localeCompare(b.province_name_th || ''));
              break;
            case "districts":
              sortedData = sortedData.sort((a, b) => (a.district_name_th || '').localeCompare(b.district_name_th || ''));
              break;
            case "sub-districts":
              sortedData = sortedData.sort((a, b) => (a.sub_district_name_th || '').localeCompare(b.sub_district_name_th || ''));
              break;
            default:
              // Keep original data if no specific sorting rule
              break;
          }
        }

        if (key === "sub-districts") {
          dropdownObj["subdistricts"] = sortedData;
        } else {
          dropdownObj[key as keyof DropdownlistData] = sortedData;
        }
      });

      set({
        ...dropdownObj,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
        error: undefined
      });

    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  },

  setData: (data: Partial<DropdownlistData>) => {
    set((state) => ({
      ...state,
      ...data,
      lastUpdated: new Date().toISOString()
    }));
  },

  getData: () => {
    const val = get();
    return val;
  },

  clearData: () => {
    set({
      sites: [],
      departments: [],
      clients: [],
      vehicles: [],
      locations: [],
      driver_roles: [],
      masterdrivers: [],
      mastercauses: [],
      provinces: [],
      districts: [],
      subdistricts: [],
      isLoading: false,
      lastUpdated: undefined,
      error: undefined
    });
  },
}))


