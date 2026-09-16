// Independently authored Chinese prompts. No source-site interpretations/translations.
const planets={
 Sun:'太阳象征自我认同与表达意愿。可以借此思考：你希望哪些长处被看见？',
 Moon:'月亮对应情绪体验与熟悉感。可以记录：怎样的日常节奏让你感到安稳？',
 Mercury:'水星的主题是信息、学习与沟通。试着比较当地语言、学习资源和交流方式。',
 Venus:'金星对应审美与关系体验。可以留意：你喜欢怎样的社交氛围和生活细节？',
 Mars:'火星常被用来讨论行动和竞争。可以审视自己的投入方式，同时安排休息与边界。',
 Jupiter:'木星的主题是视野、知识与拓展。可以把兴趣转化为可验证的学习或旅行计划。',
 Saturn:'土星对应责任、规则与长期积累。可以思考愿意承担哪些任务，以及能否持续。',
 Uranus:'天王星常被联系到自主与改变。可以比较新环境提供的选择，以及变化带来的成本。',
 Neptune:'海王星的主题是想象、共情与理想。记录灵感的同时，也检查信息和期望是否清楚。',
 Pluto:'冥王星常被用来讨论深入探索与转变。可以留意自己在压力下的习惯和支持资源。',
 Chiron:'凯龙星在占星中常对应脆弱经验与学习。可以用它整理个人感受，不据此判断健康状况。',
 'North Node':'北交点是月球轨道的几何交点，在占星中常用于讨论成长方向。可以将它作为反思提示。'
};
const axes={ASC:'上升轴把主题放在自我呈现和开始行动上。',MC:'中天轴把主题放在公众角色、工作与目标上。',DSC:'下降轴把主题放在合作、伴侣与相处方式上。',IC:'天底轴把主题放在私人生活、家庭与归属感上。'};
const meanings={};
for(const [planet,text] of Object.entries(planets))for(const [axis,context] of Object.entries(axes))meanings[planet+'|'+axis]=text+context+'线路接近只表示本程序的几何与主题规则匹配，不预示实际结果。';
module.exports={meanings};
