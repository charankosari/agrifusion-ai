"""Agronomic knowledge base used to generate training data and farming plans."""

SOILS = ["alluvial", "black", "red", "sandy", "loamy", "clay"]
WATER_MM = {"low": 250, "medium": 500, "high": 900}  # seasonal water the farmer can supply

# soil suitability 0-1, temp_opt = optimal mean temperature range (C)
CROPS = {
    "Rice": dict(sow=[6, 7], days=130, yield_q=22, cost=28000, price=2300, water=1200, temp=(22, 32), disease=0.6,
                 soils=dict(alluvial=.95, black=.6, red=.5, sandy=.2, loamy=.8, clay=.95), irrigation_days=5,
                 diseases=["Blast", "Bacterial leaf blight", "Sheath blight"],
                 fert=[("Basal", 0, "DAP 50 kg + MOP 20 kg per acre"), ("Tillering", 25, "Urea 35 kg per acre"), ("Panicle initiation", 50, "Urea 35 kg per acre")]),
    "Wheat": dict(sow=[11, 12], days=120, yield_q=18, cost=20000, price=2275, water=450, temp=(12, 25), disease=0.35,
                  soils=dict(alluvial=.95, black=.7, red=.5, sandy=.4, loamy=.95, clay=.7), irrigation_days=21,
                  diseases=["Yellow rust", "Karnal bunt", "Aphids"],
                  fert=[("Basal", 0, "DAP 50 kg + MOP 20 kg per acre"), ("Crown root", 21, "Urea 45 kg per acre"), ("Tillering", 45, "Urea 45 kg per acre")]),
    "Maize": dict(sow=[6, 7, 10], days=105, yield_q=24, cost=22000, price=2090, water=550, temp=(18, 32), disease=0.4,
                  soils=dict(alluvial=.85, black=.7, red=.75, sandy=.5, loamy=.95, clay=.5), irrigation_days=10,
                  diseases=["Fall armyworm", "Turcicum leaf blight", "Stem borer"],
                  fert=[("Basal", 0, "DAP 40 kg + MOP 20 kg per acre"), ("Knee-high", 25, "Urea 45 kg per acre"), ("Tasseling", 50, "Urea 30 kg per acre")]),
    "Cotton": dict(sow=[5, 6], days=170, yield_q=8, cost=38000, price=7100, water=700, temp=(21, 35), disease=0.65,
                   soils=dict(alluvial=.6, black=.95, red=.6, sandy=.3, loamy=.7, clay=.6), irrigation_days=14,
                   diseases=["Pink bollworm", "Whitefly", "Leaf curl virus"],
                   fert=[("Basal", 0, "DAP 50 kg per acre"), ("Squaring", 35, "Urea 40 kg + MOP 25 kg per acre"), ("Flowering", 65, "Urea 40 kg per acre")]),
    "Tomato": dict(sow=[6, 7, 10, 11], days=110, yield_q=100, cost=85000, price=1800, water=600, temp=(18, 29), disease=0.8,
                   soils=dict(alluvial=.8, black=.6, red=.9, sandy=.6, loamy=.95, clay=.4), irrigation_days=4,
                   diseases=["Early blight", "Late blight", "Leaf curl virus", "Fruit borer"],
                   fert=[("Basal", 0, "FYM 4 t + DAP 50 kg per acre"), ("Vegetative", 25, "Urea 30 kg + MOP 20 kg per acre"), ("Fruiting", 50, "NPK 19:19:19 foliar spray")]),
    "Potato": dict(sow=[10, 11], days=100, yield_q=90, cost=65000, price=1500, water=500, temp=(14, 24), disease=0.7,
                   soils=dict(alluvial=.9, black=.4, red=.6, sandy=.8, loamy=.95, clay=.3), irrigation_days=8,
                   diseases=["Late blight", "Early blight", "Black scurf"],
                   fert=[("Basal", 0, "FYM 4 t + DAP 60 kg + MOP 40 kg per acre"), ("Earthing up", 30, "Urea 40 kg per acre")]),
    "Onion": dict(sow=[10, 11, 12], days=130, yield_q=80, cost=62000, price=1700, water=500, temp=(13, 28), disease=0.5,
                  soils=dict(alluvial=.8, black=.6, red=.75, sandy=.7, loamy=.95, clay=.4), irrigation_days=8,
                  diseases=["Purple blotch", "Thrips", "Basal rot"],
                  fert=[("Basal", 0, "FYM 4 t + DAP 40 kg per acre"), ("Bulb initiation", 30, "Urea 30 kg per acre"), ("Bulb development", 55, "MOP 25 kg per acre")]),
    "Groundnut": dict(sow=[6, 7], days=110, yield_q=9, cost=26000, price=6377, water=500, temp=(22, 32), disease=0.45,
                      soils=dict(alluvial=.6, black=.5, red=.9, sandy=.95, loamy=.8, clay=.3), irrigation_days=12,
                      diseases=["Tikka leaf spot", "Collar rot", "Leaf miner"],
                      fert=[("Basal", 0, "SSP 100 kg + Gypsum 200 kg per acre"), ("Pegging", 35, "Gypsum 200 kg per acre")]),
    "Chilli": dict(sow=[6, 7, 10], days=150, yield_q=14, cost=72000, price=9500, water=650, temp=(20, 30), disease=0.75,
                   soils=dict(alluvial=.7, black=.8, red=.85, sandy=.5, loamy=.9, clay=.4), irrigation_days=7,
                   diseases=["Anthracnose", "Thrips & mites", "Leaf curl virus"],
                   fert=[("Basal", 0, "FYM 4 t + DAP 50 kg per acre"), ("Vegetative", 30, "Urea 30 kg per acre"), ("Flowering", 60, "NPK 19:19:19 + MOP 20 kg")]),
    "Soybean": dict(sow=[6, 7], days=100, yield_q=8, cost=18000, price=4600, water=450, temp=(20, 30), disease=0.4,
                    soils=dict(alluvial=.8, black=.95, red=.7, sandy=.4, loamy=.85, clay=.6), irrigation_days=15,
                    diseases=["Yellow mosaic virus", "Girdle beetle", "Rust"],
                    fert=[("Basal", 0, "DAP 40 kg + MOP 15 kg per acre")]),
}

CROPS.update({
    "Chickpea": dict(sow=[10, 11], days=105, yield_q=7, cost=16000, price=5440, water=250, temp=(15, 27), disease=0.35,
                     soils=dict(alluvial=.7, black=.95, red=.7, sandy=.6, loamy=.8, clay=.6), irrigation_days=25,
                     diseases=["Fusarium wilt", "Pod borer", "Ascochyta blight"],
                     fert=[("Basal", 0, "DAP 40 kg per acre"), ("Flowering", 45, "2% urea foliar spray")]),
    "Sorghum": dict(sow=[6, 7, 10], days=110, yield_q=10, cost=14000, price=3180, water=350, temp=(24, 33), disease=0.25,
                    soils=dict(alluvial=.7, black=.9, red=.8, sandy=.6, loamy=.8, clay=.6), irrigation_days=20,
                    diseases=["Shoot fly", "Grain mold", "Anthracnose"],
                    fert=[("Basal", 0, "DAP 30 kg per acre"), ("Knee-high", 30, "Urea 35 kg per acre")]),
    "Sunflower": dict(sow=[6, 7, 10, 11], days=95, yield_q=6, cost=18000, price=6760, water=450, temp=(20, 30), disease=0.4,
                      soils=dict(alluvial=.75, black=.9, red=.8, sandy=.5, loamy=.85, clay=.55), irrigation_days=15,
                      diseases=["Downy mildew", "Alternaria leaf spot", "Head borer"],
                      fert=[("Basal", 0, "DAP 40 kg + MOP 15 kg per acre"), ("Bud stage", 35, "Urea 30 kg per acre")]),
    "Brinjal": dict(sow=[6, 7, 10, 11], days=150, yield_q=70, cost=68000, price=2000, water=600, temp=(20, 32), disease=0.7,
                    soils=dict(alluvial=.8, black=.7, red=.85, sandy=.6, loamy=.95, clay=.45), irrigation_days=5,
                    diseases=["Shoot & fruit borer", "Little leaf", "Bacterial wilt"],
                    fert=[("Basal", 0, "FYM 4 t + DAP 50 kg per acre"), ("Vegetative", 30, "Urea 35 kg per acre"), ("Fruiting", 60, "NPK 19:19:19 foliar spray")]),
})
CROP_NAMES = list(CROPS)
# price seasonality: month of annual price peak, amplitude, yearly trend, storable (can wait to sell)
PRICE = {
    "Rice": (5, .06, .04, True), "Wheat": (8, .07, .05, True), "Maize": (4, .10, .03, True),
    "Cotton": (5, .08, .03, True), "Tomato": (7, .45, .02, False), "Potato": (7, .30, .03, True),
    "Onion": (10, .40, .03, True), "Groundnut": (4, .08, .05, True), "Chilli": (3, .20, .04, True),
    "Soybean": (5, .10, .03, True), "Chickpea": (4, .08, .04, True), "Sorghum": (5, .09, .03, True),
    "Sunflower": (3, .08, .04, True), "Brinjal": (6, .35, .02, False),
}
# soil -> representative water retention bonus
WEATHER_FALLBACK = {1: (22, 60, 15), 2: (25, 55, 15), 3: (29, 50, 20), 4: (32, 50, 30), 5: (33, 55, 50), 6: (29, 75, 110),
                    7: (27, 82, 170), 8: (27, 83, 160), 9: (27, 80, 130), 10: (26, 72, 70), 11: (23, 65, 25), 12: (21, 62, 10)}
