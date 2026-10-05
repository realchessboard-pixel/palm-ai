/**
 * Birth places for the Kundli form. India uses one time zone (IST, UTC+5:30)
 * with no daylight saving, so a city list plus coordinates is enough here.
 * Anyone born elsewhere can enter coordinates and a UTC offset manually.
 */
export interface Place {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  /** Minutes east of UTC. */
  tzMinutes: number;
}

const IST = 330;
const raw: [string, string, number, number][] = [
  ["New Delhi", "Delhi", 28.6139, 77.209],
  ["Mumbai", "Maharashtra", 19.076, 72.8777],
  ["Bengaluru", "Karnataka", 12.9716, 77.5946],
  ["Kolkata", "West Bengal", 22.5726, 88.3639],
  ["Chennai", "Tamil Nadu", 13.0827, 80.2707],
  ["Hyderabad", "Telangana", 17.385, 78.4867],
  ["Ahmedabad", "Gujarat", 23.0225, 72.5714],
  ["Pune", "Maharashtra", 18.5204, 73.8567],
  ["Jaipur", "Rajasthan", 26.9124, 75.7873],
  ["Lucknow", "Uttar Pradesh", 26.8467, 80.9462],
  ["Kanpur", "Uttar Pradesh", 26.4499, 80.3319],
  ["Nagpur", "Maharashtra", 21.1458, 79.0882],
  ["Indore", "Madhya Pradesh", 22.7196, 75.8577],
  ["Bhopal", "Madhya Pradesh", 23.2599, 77.4126],
  ["Patna", "Bihar", 25.5941, 85.1376],
  ["Vadodara", "Gujarat", 22.3072, 73.1812],
  ["Surat", "Gujarat", 21.1702, 72.8311],
  ["Rajkot", "Gujarat", 22.3039, 70.8022],
  ["Ludhiana", "Punjab", 30.901, 75.8573],
  ["Amritsar", "Punjab", 31.634, 74.8723],
  ["Chandigarh", "Chandigarh", 30.7333, 76.7794],
  ["Agra", "Uttar Pradesh", 27.1767, 78.0081],
  ["Varanasi", "Uttar Pradesh", 25.3176, 82.9739],
  ["Prayagraj", "Uttar Pradesh", 25.4358, 81.8463],
  ["Meerut", "Uttar Pradesh", 28.9845, 77.7064],
  ["Ghaziabad", "Uttar Pradesh", 28.6692, 77.4538],
  ["Noida", "Uttar Pradesh", 28.5355, 77.391],
  ["Gurugram", "Haryana", 28.4595, 77.0266],
  ["Faridabad", "Haryana", 28.4089, 77.3178],
  ["Dehradun", "Uttarakhand", 30.3165, 78.0322],
  ["Shimla", "Himachal Pradesh", 31.1048, 77.1734],
  ["Jammu", "Jammu and Kashmir", 32.7266, 74.857],
  ["Srinagar", "Jammu and Kashmir", 34.0837, 74.7973],
  ["Jodhpur", "Rajasthan", 26.2389, 73.0243],
  ["Udaipur", "Rajasthan", 24.5854, 73.7125],
  ["Kota", "Rajasthan", 25.2138, 75.8648],
  ["Gwalior", "Madhya Pradesh", 26.2183, 78.1828],
  ["Jabalpur", "Madhya Pradesh", 23.1815, 79.9864],
  ["Raipur", "Chhattisgarh", 21.2514, 81.6296],
  ["Ranchi", "Jharkhand", 23.3441, 85.3096],
  ["Jamshedpur", "Jharkhand", 22.8046, 86.2029],
  ["Bhubaneswar", "Odisha", 20.2961, 85.8245],
  ["Cuttack", "Odisha", 20.4625, 85.883],
  ["Guwahati", "Assam", 26.1445, 91.7362],
  ["Siliguri", "West Bengal", 26.7271, 88.3953],
  ["Visakhapatnam", "Andhra Pradesh", 17.6868, 83.2185],
  ["Vijayawada", "Andhra Pradesh", 16.5062, 80.648],
  ["Tirupati", "Andhra Pradesh", 13.6288, 79.4192],
  ["Warangal", "Telangana", 17.9689, 79.5941],
  ["Mysuru", "Karnataka", 12.2958, 76.6394],
  ["Mangaluru", "Karnataka", 12.9141, 74.856],
  ["Hubballi", "Karnataka", 15.3647, 75.124],
  ["Kochi", "Kerala", 9.9312, 76.2673],
  ["Thiruvananthapuram", "Kerala", 8.5241, 76.9366],
  ["Kozhikode", "Kerala", 11.2588, 75.7804],
  ["Coimbatore", "Tamil Nadu", 11.0168, 76.9558],
  ["Madurai", "Tamil Nadu", 9.9252, 78.1198],
  ["Tiruchirappalli", "Tamil Nadu", 10.7905, 78.7047],
  ["Salem", "Tamil Nadu", 11.6643, 78.146],
  ["Puducherry", "Puducherry", 11.9416, 79.8083],
  ["Nashik", "Maharashtra", 19.9975, 73.7898],
  ["Aurangabad", "Maharashtra", 19.8762, 75.3433],
  ["Kolhapur", "Maharashtra", 16.705, 74.2433],
  ["Panaji", "Goa", 15.4909, 73.8278],
  ["Ujjain", "Madhya Pradesh", 23.1765, 75.7885],
  ["Haridwar", "Uttarakhand", 29.9457, 78.1642],
  ["Ayodhya", "Uttar Pradesh", 26.7922, 82.1998],
  ["Gorakhpur", "Uttar Pradesh", 26.7606, 83.3732],
  ["Bareilly", "Uttar Pradesh", 28.367, 79.4304],
  ["Aligarh", "Uttar Pradesh", 27.8974, 78.088],
  ["Mathura", "Uttar Pradesh", 27.4924, 77.6737],
  ["Gaya", "Bihar", 24.7914, 85.0002],
  ["Muzaffarpur", "Bihar", 26.1209, 85.3647],
  ["Imphal", "Manipur", 24.817, 93.9368],
  ["Shillong", "Meghalaya", 25.5788, 91.8933],
  ["Agartala", "Tripura", 23.8315, 91.2868],
  ["Gangtok", "Sikkim", 27.3389, 88.6065],
];

export const PLACES: Place[] = raw
  .map(([name, state, lat, lon]) => ({
    id: name.toLowerCase().replace(/[^a-z]+/g, "-"),
    name,
    state,
    lat,
    lon,
    tzMinutes: IST,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function findPlace(id: string): Place | null {
  return PLACES.find((p) => p.id === id) ?? null;
}

export const DEFAULT_PLACE_ID = "new-delhi";
