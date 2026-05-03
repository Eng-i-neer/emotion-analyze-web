import json
import traceback
from openai import OpenAI
import config

client = None

def _get_client():
    global client
    if client is None:
        client = OpenAI(api_key=config.DEEPSEEK_API_KEY, base_url=config.DEEPSEEK_BASE_URL)
    return client


DIARY_SYSTEM_PROMPT = """你是一个温和、专业的个人情绪观察助手。用户会提供当天的日记内容，你需要全面分析并返回结构化JSON。

你的任务：
1. 理解日记内容，判断用户的情绪状态
2. 给出心情自评分、压力等级、睡眠相关评估
3. 识别情绪类型和相关标签
4. 给出温和可执行的调节建议

严格要求：
1. 只返回JSON，不要返回任何解释性文字
2. 不要做医学诊断，不要提及任何心理疾病名称
3. risk_level只是日常关注等级：normal=正常，watch=需要留意，high=建议寻求支持
4. suggestions要生活化、温和、可执行，像朋友的关心
5. 如果文本很短也要尽量分析
6. 如果出现极端危险内容，在suggestions中温和建议联系信任的人或专业支持

返回JSON格式：
{
  "summary": "一句话总结今天的心理状态",
  "main_emotion": "主要情绪（如：开心、平静、焦虑、难过、愤怒、疲惫、压力大、委屈、迷茫等）",
  "secondary_emotions": ["次要情绪1", "次要情绪2"],
  "sentiment": "positive 或 neutral 或 negative",
  "emotion_score": 1到10的整数（情绪正面程度），
  "stress_score": 1到10的整数（压力大小），
  "energy_score": 1到10的整数（精力充沛程度），
  "user_mood_score": 1到10的整数（你替用户评估的总体心情分），
  "user_stress_score": 1到10的整数（你替用户评估的总体压力分），
  "sleep_hours": 预估睡眠时长（浮点数，如果日记未提及则填0），
  "sleep_quality": 1到10的整数（如果日记未提及睡眠则填5），
  "sleep_related": true或false（日记是否涉及睡眠相关内容），
  "mood_types": ["情绪类型1", "情绪类型2"]（从这些中选：开心、平静、焦虑、难过、愤怒、疲惫、压力大、委屈、迷茫），
  "user_tags": ["标签1", "标签2"]（从这些中选：学习、工作、家庭、人际、恋爱、身体、睡眠、考试、未来规划），
  "stress_sources": ["压力来源1", "压力来源2"],
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "auto_tags": ["自动标签1", "自动标签2"],
  "risk_level": "normal 或 watch 或 high",
  "suggestions": ["温和建议1", "温和建议2", "温和建议3"]
}"""

REPORT_SYSTEM_PROMPT = """你是一个温和的个人情绪观察助手。用户会提供一段时间内的情绪记录摘要，你需要生成该时段的情绪报告。

严格要求：
1. 只返回JSON，不要返回解释性文字
2. 不做医学诊断，不提及心理疾病名称
3. 建议要生活化、温和、可执行
4. 分析要客观，既关注问题也肯定积极变化

返回JSON格式：
{
  "period_summary": "本周期整体状态总结",
  "mood_trend": "情绪趋势描述",
  "stress_trend": "压力趋势描述",
  "main_emotions": ["主要情绪1", "主要情绪2"],
  "main_stress_sources": ["压力来源1", "压力来源2"],
  "positive_changes": ["积极变化1", "积极变化2"],
  "potential_issues": ["需要关注的点1", "需要关注的点2"],
  "suggestions_next_period": ["下阶段建议1", "下阶段建议2", "下阶段建议3"]
}"""

SUGGESTION_SYSTEM_PROMPT = """你是一个温暖的情绪调节顾问。根据用户最近的情绪状态，提供个性化的、温和可执行的调节建议。

严格要求：
1. 只返回JSON
2. 不做医学诊断
3. 建议要具体、生活化、像朋友的关心
4. 每个类别给3-5条建议

返回JSON格式：
{
  "personalized_suggestions": {
    "情绪类型1": ["建议1", "建议2", "建议3"],
    "情绪类型2": ["建议1", "建议2", "建议3"]
  },
  "daily_quote": "一句温暖的话送给用户",
  "focus_areas": ["需要特别关注的方面1", "需要特别关注的方面2"]
}"""


def get_default_analysis():
    return {
        "summary": "暂时无法分析，已保存记录",
        "main_emotion": "未知",
        "secondary_emotions": [],
        "sentiment": "neutral",
        "emotion_score": 5, "stress_score": 5, "energy_score": 5,
        "user_mood_score": 5, "user_stress_score": 5,
        "sleep_hours": 0, "sleep_quality": 5,
        "sleep_related": False,
        "mood_types": [], "user_tags": [],
        "stress_sources": [], "keywords": [], "auto_tags": [],
        "risk_level": "normal",
        "suggestions": ["记录本身就是一种自我关照，继续保持"]
    }


def get_default_report():
    return {
        "period_summary": "暂时无法生成报告",
        "mood_trend": "数据不足", "stress_trend": "数据不足",
        "main_emotions": [], "main_stress_sources": [],
        "positive_changes": [], "potential_issues": [],
        "suggestions_next_period": ["继续坚持每日记录"]
    }


def analyze_diary(diary_text, **kwargs):
    if not config.DEEPSEEK_API_KEY:
        return get_default_analysis()

    user_msg = f"日记内容：\n{diary_text or '(用户未填写日记)'}"

    try:
        c = _get_client()
        resp = c.chat.completions.create(
            model=config.DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": DIARY_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=1200,
            extra_body={"thinking": {"type": "disabled"}}
        )
        content = resp.choices[0].message.content
        if not content:
            return get_default_analysis()
        result = json.loads(content)
        defaults = get_default_analysis()
        for key in defaults:
            if key not in result:
                result[key] = defaults[key]
        return result
    except Exception:
        traceback.print_exc()
        return get_default_analysis()


def generate_period_report(records_summary, period_type='weekly'):
    if not config.DEEPSEEK_API_KEY:
        return get_default_report()

    period_label = '一周' if period_type == 'weekly' else '一个月'
    user_msg = f"以下是用户过去{period_label}的情绪记录摘要，请生成报告：\n\n{records_summary}"

    try:
        c = _get_client()
        resp = c.chat.completions.create(
            model=config.DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": REPORT_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=1500,
            extra_body={"thinking": {"type": "disabled"}}
        )
        content = resp.choices[0].message.content
        if not content:
            return get_default_report()
        result = json.loads(content)
        defaults = get_default_report()
        for key in defaults:
            if key not in result:
                result[key] = defaults[key]
        return result
    except Exception:
        traceback.print_exc()
        return get_default_report()


def generate_suggestions(recent_summary):
    if not config.DEEPSEEK_API_KEY:
        return None

    try:
        c = _get_client()
        resp = c.chat.completions.create(
            model=config.DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": SUGGESTION_SYSTEM_PROMPT},
                {"role": "user", "content": f"用户最近的情绪状态摘要：\n{recent_summary}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.8,
            max_tokens=1200,
            extra_body={"thinking": {"type": "disabled"}}
        )
        content = resp.choices[0].message.content
        if not content:
            return None
        return json.loads(content)
    except Exception:
        traceback.print_exc()
        return None
