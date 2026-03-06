export const FARMERS_LIST_RADIUS_OPTIONS_KM = [2, 5, 10, 15, 20] as const;

export const FARMERS_LIST_DEFAULT_RADIUS_KM: (typeof FARMERS_LIST_RADIUS_OPTIONS_KM)[number] = 10;

export const FARMERS_LIST_DEFAULT_PAGE_SIZE = 12;

export const FARMERS_LIST_PAGE_SIZE_OPTIONS = [12, 24, 48] as const;

