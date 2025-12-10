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
  positions?: any[];
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
  positions: [],
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
      "/positions",
      "/provinces",
      "/districts",
      "/sub-districts"
    ];
    try {
      const authToken = localStorage.getItem('authToken');
      async function parallelBatches(list: string[], batchSize: number) {
        const result = [];

        for (let i = 0; i < list.length; i += batchSize) {
          const batch = list.slice(i, i + batchSize);

          const res = await Promise.all(
            batch.map((api) =>
              fetch("/api/list", {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  "X-Api-Path": api,
                },
              }).then((r) => r.json())
            )
          );

          result.push(...res);
        }

        return result;
      }

      const data = await parallelBatches(list_api, 3);
      const dropdownObj: DropdownlistData = {};
      list_api.forEach((api, index) => {
        let key = api.substring(1);
        let sortedData = data[index];

        // if(key == "sites") {
        //   // Remove site_id = 1
        //   sortedData = sortedData.filter((item: any) => item.site_id !== 1);
        // }

        if (Array.isArray(sortedData)) {
          switch (key) {
            case "sites":
              sortedData = sortedData.sort((a, b) => (a.site_name_th || '').localeCompare(b.site_name_th || ''));
              // sortedData = sortedData.filter((item: any) => item.site_id !== 1);
              break;
            case "departments":
              sortedData = sortedData.sort((b, a) => (a.department_name_th || '').localeCompare(b.department_name_th || ''));
              // sortedData = sortedData.filter((item: any) => (item.department_id >= 15));
              break;
            case "clients":
              sortedData = sortedData.sort((a, b) => (a.client_name || '').localeCompare(b.client_name || ''));
              sortedData = sortedData.filter((item: any) => (item.client_id !== 0));
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
            case "positions":
              sortedData = sortedData.sort((a, b) => (a.position_name || '').localeCompare(b.position_name || ''));
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
      positions: [],
      isLoading: false,
      lastUpdated: undefined,
      error: undefined
    });
  },
}))


export const handleFetchData = async (name: string) => {
  console.log('Fetching data for:', name);  
  const res = await fetch(`/api/list`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Path': `/${name}`
    }
  });
  const data = await res.json();
  console.log('data from handleFetchData:', data);
  return data;
}