# AI-Powered Chat-to-Content Workflow

## Automated System for Transforming Chat Threads into Blog Posts & LinkedIn Content

This document provides detailed instructions and prompt templates for using AI (Claude, local LLMs, or other models) to automatically transform chat threads into polished content.

---

## System Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Input Chat    │ →  │   AI Processing  │ →  │  Output Content │
│    Thread       │    │   (This System)  │    │  (Blog + Social)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## For Claude (Anthropic)

### System Prompt

```
You are ContentTransformer, an AI specialized in converting chat conversations into engaging blog posts and social media content.

Your role:
1. Analyze the input chat thread to identify key insights, themes, and valuable content
2. Extract the most important and actionable information
3. Transform Q&A format into narrative article format
4. Generate multiple content pieces optimized for different platforms
5. Maintain the original voice and authenticity while improving clarity

You must follow the structured workflow below and produce consistent, high-quality output every time.
```

### Main Prompt Template

```
# Task: Transform Chat Thread into Content

## Input Chat Thread:
[PASTE YOUR CHAT THREAD HERE]

## Instructions:

### Step 1: ANALYZE
- Main topic:
- Key insights (3-5):
- Target audience:
- Actionable advice:

### Step 2: EXTRACT
- Best quotes:
- Problems solved:
- Content to cut:

### Step 3: GENERATE OUTPUT

#### Blog Post
- Title options (3):
- Full article (1500-2000 words):

#### LinkedIn Posts (3 variations)
- Post 1 (Story-driven):
- Post 2 (Educational):
- Post 3 (Contrarian):

#### Social Media Posts (5-10)

## Output Format:
Use clear markdown with headers for each section.
```

### Claude API Implementation

```python
import anthropic
import os

def transform_with_claude(chat_text: str) -> str:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    system_prompt = """You are ContentTransformer, specialized in converting chat conversations into engaging blog posts and social media content. Follow the structured workflow and produce consistent output."""
    
    prompt = f"""# Task: Transform Chat Thread into Content

## Input Chat Thread:
{chat_text}

## Instructions:

### Step 1: ANALYZE
- Main topic:
- Key insights (3-5):
- Target audience:
- Actionable advice:

### Step 2: EXTRACT
- Best quotes:
- Problems solved:
- Content to cut:

### Step 3: GENERATE OUTPUT

#### Blog Post
- Title options (3):
- Full article (1500-2000 words):

#### LinkedIn Posts (3 variations)
- Post 1 (Story-driven):
- Post 2 (Educational):
- Post 3 (Contrarian):

#### Social Media Posts (5-10)

## Output Format:
Use clear markdown with headers for each section."""
    
    response = client.messages.create(
        model="claude-3-sonnet-20240229",
        max_tokens=4000,
        system=system_prompt,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return response.content[0].text
```

---

## For Local LLMs (Ollama, LM Studio)

### Recommended Models

| Model | Size | Best For |
|-------|------|----------|
| Llama 2 70B | 70B | Long-form content |
| Llama 2 13B | 13B | Quick iterations |
| Mistral 7B | 7B | Short-form content |
| Mixtral 8x7B | 47B | High-quality output |

### Simplified Prompt for Local LLMs

Local models work better with simpler prompts:

```
Transform this chat into content:

Chat:
[PASTE CHAT HERE]

Follow these steps:
1. Find main topic and 3-5 key insights
2. Create blog post (1500-2000 words)
3. Create 3 LinkedIn posts (different styles)
4. Create 5-10 social media posts

Output format:
## Blog Post
### Title Options:
1. 
2. 
3. 

### Full Article:
[Introduction]
[Body with subheadings]
[Conclusion with CTA]

## LinkedIn Posts
### Post 1 (Story):
### Post 2 (Educational):
### Post 3 (Contrarian):

## Social Media Posts
1. 
2. 
3. 
```

### Ollama Implementation

```python
import ollama

def transform_with_ollama(chat_text: str, model: str = "llama2") -> str:
    system_prompt = """You are ContentBot, specialized in transforming chat conversations into engaging written content. Follow a strict, repeatable process."""
    
    prompt = f"""Transform this chat into content:

Chat:
{chat_text}

Follow these steps:
1. Find main topic and 3-5 key insights
2. Create blog post (1500-2000 words)
3. Create 3 LinkedIn posts (different styles)
4. Create 5-10 social media posts

Output format:
## Blog Post
### Title Options:
### Full Article:
## LinkedIn Posts (3):
## Social Media Posts (5-10):"""
    
    response = ollama.chat(model=model, messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ])
    
    return response['message']['content']
```

---

## Automated Workflow Script

```python
#!/usr/bin/env python3
"""Chat-to-Content Transformer - Automated workflow"""

import os
import json
from datetime import datetime
from typing import Dict

class ChatToContentTransformer:
    def __init__(self, use_local: bool = False, model: str = "llama2"):
        self.use_local = use_local
        self.model = model
    
    def transform_chat(self, chat_text: str, output_dir: str = "./output") -> Dict:
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if self.use_local:
            content = self._call_local_llm(chat_text)
        else:
            content = self._call_cloud_llm(chat_text)
        
        # Save outputs
        md_file = os.path.join(output_dir, f"content_{timestamp}.md")
        with open(md_file, 'w') as f:
            f.write(content)
        
        return {"status": "success", "file": md_file, "timestamp": timestamp}
    
    def _call_cloud_llm(self, chat_text: str) -> str:
        import anthropic
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        
        prompt = f"""Transform this chat into content:

Chat:
{chat_text}

Output format:
## Blog Post
### Title Options (3):
### Full Article:
## LinkedIn Posts (3):
## Social Media Posts (5-10):"""
        
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
    
    def _call_local_llm(self, chat_text: str) -> str:
        import ollama
        
        prompt = f"""Transform this chat into content:

Chat:
{chat_text}

Output format:
## Blog Post
### Title Options (3):
### Full Article:
## LinkedIn Posts (3):
## Social Media Posts (5-10):"""
        
        response = ollama.chat(model=self.model, messages=[
            {"role": "user", "content": prompt}
        ])
        return response['message']['content']


if __name__ == "__main__":
    # Usage
    transformer = ChatToContentTransformer(use_local=True, model="llama2")
    
    with open("chat_input.txt", "r") as f:
        chat_text = f.read()
    
    result = transformer.transform_chat(chat_text)
    print(f"Content generated: {result['file']}")
```

---

## Prompt Templates by Use Case

### Template 1: Quick Blog Post

```
Transform this chat into a blog post:

CHAT:
[PASTE CHAT]

OUTPUT FORMAT:
# [Title - 3 options]

## Introduction
[Hook + what they'll learn]

## [Section 1]
[Content]

## [Section 2]
[Content]

## Conclusion
[Summary + CTA]
```

### Template 2: LinkedIn-First

```
Convert this chat into LinkedIn content:

CHAT:
[PASTE CHAT]

POST 1 - Story Format:
- Hook (first 2 lines)
- Brief story
- 3 key points with →
- Takeaway
- Question
- 3 hashtags

POST 2 - Educational:
- Hook
- "Here's what I learned:"
- 5 bullet points
- Main lesson
- CTA
- 3 hashtags

POST 3 - Contrarian:
- Contrarian hook
- Why common belief is wrong
- Better approach (3 points)
- CTA
- 3 hashtags
```

### Template 3: Multi-Platform

```
From this chat, create a complete content package:

CHAT:
[PASTE CHAT]

DELIVERABLES:

1. BLOG POST
   - 3 title options
   - 1500-2000 word article
   - SEO meta description
   - 5 target keywords

2. LINKEDIN CONTENT
   - Main post (story format)
   - 2 follow-up posts

3. TWITTER/X THREAD
   - 8-10 tweet thread

4. NEWSLETTER
   - Subject line (3 options)
   - 300-word summary
```

---

## Validation & Quality Control

### Automated Quality Checks

```python
import re

def validate_content(content: str) -> dict:
    checks = {
        "has_title": bool(re.search(r'^#\s+.+', content, re.MULTILINE)),
        "has_sections": len(re.findall(r'^##\s+.+', content, re.MULTILINE)) >= 3,
        "word_count": len(content.split()) >= 1500,
        "has_linkedin": "LinkedIn" in content or "linkedin" in content,
        "has_social": bool(re.search(r'Social|Twitter|Tweet', content, re.IGNORECASE))
    }
    
    score = sum(checks.values()) / len(checks)
    
    return {
        "passed": score >= 0.7,
        "score": score,
        "checks": checks
    }
```

### Manual Review Checklist

- [ ] **Voice Consistency** - Does it sound like you?
- [ ] **Accuracy** - Are all facts correct?
- [ ] **Value** - Does it provide genuine value?
- [ ] **Readability** - Is it easy to read?
- [ ] **Engagement** - Does it encourage interaction?

---

## Usage

### Command Line

```bash
# Save chat to file
echo "Your chat thread..." > chat.txt

# Run transformer with Claude
python ai-content-workflow.py chat.txt --output ./blog-content

# Run transformer with local LLM
python ai-content-workflow.py chat.txt --output ./blog-content --local --model llama2
```

### As a Module

```python
from ai_content_workflow import ChatToContentTransformer

transformer = ChatToContentTransformer(use_local=False)

with open("chat.txt") as f:
    chat = f.read()

result = transformer.transform_chat(chat)
print(result["file"])
```

---

## Configuration

### Environment Variables

```bash
# For Claude API
export ANTHROPIC_API_KEY="your-api-key-here"

# For Ollama (local)
# No API key needed - runs locally
```

### Settings File (config.json)

```json
{
  "default_model": "claude-3-sonnet",
  "local_model": "llama2",
  "output_dir": "./output",
  "max_tokens": 4000,
  "temperature": 0.7
}
```

---

## Best Practices

1. **Always review** AI-generated content before publishing
2. **Add personal touches** to maintain authenticity
3. **Verify facts** and claims made in the content
4. **Optimize for SEO** with relevant keywords
5. **Test different prompts** to find what works best for your voice

---

*This workflow is designed for repetitive, consistent content generation from chat threads. Customize the prompts and templates to match your specific needs and voice.*