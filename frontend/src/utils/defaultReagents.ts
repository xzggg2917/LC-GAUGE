import type { ReagentFactor } from '../contexts/AppContext'

// 🧮 计算 S/H/E 分数的辅助函数（统一计算逻辑）
export const calculateScores = (reagent: Partial<ReagentFactor>) => {
  const safetyScore = Number((
    (reagent.releasePotential || 0) +
    (reagent.fireExplos || 0) +
    (reagent.reactDecom || 0) +
    (reagent.acuteToxicity || 0)
  ).toFixed(3))
  
  const healthScore = Number((
    (reagent.irritation || 0) +
    (reagent.chronicToxicity || 0)
  ).toFixed(3))
  
  const envScore = Number((
    (reagent.persistency || 0) +
    (reagent.airHazard || 0) +
    (reagent.waterHazard || 0)
  ).toFixed(3))
  
  return { safetyScore, healthScore, envScore }
}

// 预定义的试剂基础数据（不含 S/H/E 分数，由系统自动计算）
type BaseReagentData = Omit<ReagentFactor, 'safetyScore' | 'healthScore' | 'envScore' | 'isCustom' | 'originalData'>

const BASE_REAGENTS: BaseReagentData[] = [
  { id: '1', name: 'Acetone', density: 0.784, releasePotential: 0.699, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.297, irritation: 0.625, chronicToxicity: 0.185, persistency: 0.126, airHazard: 0.185, waterHazard: 0.000, regeneration: 0.250, disposal: 0.250 },
  { id: '2', name: 'Acetonitrile', density: 0.786, releasePotential: 0.612, fireExplos: 1.000, reactDecom: 0.600, acuteToxicity: 0.509, irritation: 0.625, chronicToxicity: 0.431, persistency: 0.346, airHazard: 0.431, waterHazard: 0.000, regeneration: 0.750, disposal: 0.50 },
  { id: '3', name: 'Chloroform', density: 1.480, releasePotential: 0.681, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.393, irritation: 0.625, chronicToxicity: 0.800, persistency: 0.458, airHazard: 0.800, waterHazard: 0.178, regeneration: 0.750, disposal: 0.750 },
  { id: '4', name: 'CO2', density: 1.560, releasePotential: 1, fireExplos: 0, reactDecom: 0, acuteToxicity: 0.026, irritation: 0, chronicToxicity: 0.000, persistency: 0, airHazard: 0.000, waterHazard: 0, regeneration: 0.25, disposal: 0 },
  { id: '5', name: 'Dichloromethane', density: 1.327, releasePotential: 0.753, fireExplos: 1.000, reactDecom: 0.600, acuteToxicity: 0.264, irritation: 0.349, chronicToxicity: 0.290, persistency: 0.023, airHazard: 0.290, waterHazard: 0.031, regeneration: 0.75, disposal: 0.75 },
  { id: '6', name: 'Ethanol', density: 0.789, releasePotential: 0.579, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.292, irritation: 0.000, chronicToxicity: 0.205, persistency: 0.282, airHazard: 0.205, waterHazard: 0.000, regeneration: 0.500, disposal: 0.25 },
  { id: '7', name: 'Ethyl acetate', density: 0.897, releasePotential: 0.628, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.276, irritation: 0.625, chronicToxicity: 0.168, persistency: 0.026, airHazard: 0.168, waterHazard: 0.003, regeneration: 0.500, disposal: 0.25 },
  { id: '8', name: 'Heptane', density: 0.684, releasePotential: 0.557, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.368, irritation: 0.625, chronicToxicity: 0.157, persistency: 0.430, airHazard: 0.157, waterHazard: 0.500, regeneration: 0.75, disposal: 0.5},
  { id: '9', name: 'Hexane (n)', density: 0.661, releasePotential: 0.656, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.343, irritation: 0.625, chronicToxicity: 0.351, persistency: 0.429, airHazard: 0.351, waterHazard: 0.325, regeneration: 0.75, disposal: 0.5 },
  { id: '10', name: 'Isooctane', density: 0.690, releasePotential: 0.630, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.330, chronicToxicity: 0.000, persistency: 0.680, airHazard: 0.000, waterHazard: 0.875, regeneration: 0.75, disposal: 0.5 },
  { id: '11', name: 'Isopropanol', density: 0.786, releasePotential: 0.565, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.317, irritation: 0.625, chronicToxicity: 0.261, persistency: 0.282, airHazard: 0.261, waterHazard: 0.000, regeneration: 0.5, disposal: 0.5 },
  { id: '12', name: 'Methanol', density: 0.791, releasePotential: 0.625, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.266, irritation: 0.113, chronicToxicity: 0.316, persistency: 0.000, airHazard: 0.316, waterHazard: 0.000, regeneration: 0.5, disposal: 0.5 },
  { id: '13', name: 'Sulfuric acid 96%', density: 1.840, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.800, acuteToxicity: 0.946, irritation: 1.000, chronicToxicity: 1.000, persistency: 0.485, airHazard: 1.000, waterHazard: 0.500, regeneration: 1, disposal: 0.750 },
  { id: '14', name: 't-butyl methyl ether', density: 0.740, releasePotential: 0.716, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.220, chronicToxicity: 0.349, persistency: 0.716, airHazard: 0.349, waterHazard: 0.125, regeneration: 0.75, disposal: 0.5 },
  { id: '15', name: 'Tetrahydrofuran(THF)', density: 0.889, releasePotential: 0.680, fireExplos: 1.000, reactDecom: 0.600, acuteToxicity: 0.297, irritation: 0.625, chronicToxicity: 0.366, persistency: 0.536, airHazard: 0.366, waterHazard: 0.000, regeneration: 0.75, disposal: 0.750 },
  { id: '16', name: 'Water', density: 1, releasePotential: 0.552, fireExplos: 0, reactDecom: 0, acuteToxicity: 0, irritation: 0, chronicToxicity: 0, persistency: 0, airHazard: 0, waterHazard: 0, regeneration: 0, disposal: 0 },
  { id: '17', name: 'Formic Acid', density: 1.220, releasePotential: 0.549, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.802, irritation: 1, chronicToxicity: 0.605, persistency: 0.306, airHazard: 0.605, waterHazard: 0.125, regeneration: 0.5, disposal: 0.75 },
  { id: '18', name: 'Ammonium Acetate', density: 1.170, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity:0.000 ,irritation: 0.000, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.000, regeneration: 0.75, disposal: 1 },
  { id: '19', name: 'Diethyl Ether', density: 0.714, releasePotential: 0.785, fireExplos: 1, reactDecom: 0.6, acuteToxicity: 0.3, irritation: 0.113, chronicToxicity: 0.183, persistency: 0.666, airHazard: 0.183, waterHazard: 0, regeneration: 0.75, disposal: 0.75 },
  { id: '20', name: 'Triethylamine(TEA)', density: 0.726, releasePotential: 0.589, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.511, irritation: 1, chronicToxicity: 1.000, persistency: 0.378, airHazard: 1.000, waterHazard: 0.125, regeneration: 0.75, disposal: 0.75 },
  { id: '21', name: 'Potassium dihydrogen phosphate', density: 1.880, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.625, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.000, regeneration: 1, disposal: 1 },
  { id: '22', name: 'Sodium Hydroxide', density: 2.130, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.800, acuteToxicity: 0.990, irritation: 1, chronicToxicity: 1, persistency: 0.000, airHazard: 1, waterHazard: 0.500, regeneration: 1, disposal: 1 },
  { id: '23', name: 'Hydrochloric Acid', density: 1.180, releasePotential: 1, fireExplos: 0.000, reactDecom: 0.800, acuteToxicity: 0.772, irritation: 1, chronicToxicity: 1.000, persistency: 0.485, airHazard: 1.000, waterHazard: 0.5, regeneration: 1, disposal: 0.750 },
  { id: '24', name: 'Ammonium Carbonate', density: 1.5, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.600, acuteToxicity: 0.015, irritation: 0.625, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.125, regeneration: 0.75, disposal: 1 },
  { id: '25', name: 'Ammonium hydroxide', density: 0.890, releasePotential: 0.759, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.660, irritation: 1, chronicToxicity: 1, persistency: 0.000, airHazard: 1, waterHazard: 0.500, regeneration: 0.75, disposal: 0.75 },
  { id: '26', name: 'Dipotassium hydrogen phosphate', density: 2.440, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.625, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.000, regeneration: 1, disposal: 1 },
  { id: '27', name: 'Sodium phosphate dibasic', density: 1.064, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.625, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.000, regeneration: 1, disposal: 1 },
  { id: '28', name: 'Sodium Dihydrogen Phosphate', density: 1.91, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.625, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.000, regeneration: 1, disposal: 1 },
  { id: '29', name: 'Trifluoroacetic Acid(TFA)', density: 1.490, releasePotential: 0.644, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.240, irritation: 1, chronicToxicity: 1, persistency: 0.187, airHazard: 1, waterHazard: 0.131, regeneration: 1, disposal: 1 },
  { id: '30', name: 'Acetic Acid', density: 1.049, releasePotential: 0.492, fireExplos: 0.5, reactDecom: 0.000, acuteToxicity: 0.718, irritation: 1, chronicToxicity: 1, persistency: 0.247, airHazard: 1, waterHazard: 0.002, regeneration: 0.5, disposal: 0.75 },
  { id: '31', name: 'Difluoroacetic Acid(DFA)', density: 1.526, releasePotential: 0.439, fireExplos: 0.000, reactDecom: 0, acuteToxicity: 0.31, irritation: 1, chronicToxicity: 1, persistency: 0.026, airHazard: 1 ,waterHazard: 0.131, regeneration: 1, disposal: 1 },
  { id: '32', name: 'Phosphoric Acid', density: 1.685, releasePotential: 0.485, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.490, irritation: 1, chronicToxicity: 1, persistency: 0.485, airHazard: 1, waterHazard: 0.5, regeneration: 1, disposal: 1 },
  { id: '33', name: 'Heptafluorobutyric Acid(HFBA)', density: 1.645, releasePotential: 0.359, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.31, irritation: 1, chronicToxicity: 1, persistency: 0.026, airHazard: 1, waterHazard: 0.131, regeneration: 1, disposal: 1 },
  { id: '34', name: 'Ammonium Formate', density: 1.260, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.625, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.000, regeneration: 0.75, disposal: 1 },
  { id: '35', name: 'Ammonium Bicarbonate', density: 1.586, releasePotential: 0.000, fireExplos:0.000, reactDecom: 0.000, acuteToxicity: 0.045, irritation: 0.113, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.125, regeneration: 0.75, disposal: 1 },
  { id: '36', name: 'Sodium Heptanesulfonate', density: 1.017, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.625, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.001, regeneration: 1, disposal: 1},
  { id: '37', name: 'Sodium Dodecyl Sulfate(SDS)', density: 1.03, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.092, irritation: 0.625, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.125, regeneration: 1, disposal: 1 },
  { id: '38', name: 'Tetrabutylammonium Hydroxide', density: 0.995, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.31, irritation: 1, chronicToxicity: 1.000, persistency: 0.000, airHazard: 1.000, waterHazard: 0.125, regeneration: 1, disposal: 1 },
  { id: '39', name: 'Sodium Perchlorate', density: 2.02, releasePotential: 0.000, fireExplos: 1.000, reactDecom: 0.800, acuteToxicity: 0.000, irritation: 0.625, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.125, regeneration: 1, disposal: 1 },
]

// 🎯 生成完整的预定义试剂数据（基础数据 + 自动计算的 S/H/E 分数）
export const PREDEFINED_REAGENTS: ReagentFactor[] = BASE_REAGENTS.map(base => ({
  ...base,
  ...calculateScores(base)
}))
