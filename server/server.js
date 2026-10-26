
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
const PORT = process.env.PORT || 3001;
const DATABASE = process.env.NEO4J_DATABASE || 'cybervault';

// Allow local development and the deployed frontend.
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins
}));

app.use(express.json());

// Neo4j connection using environment variables.
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME,
    process.env.NEO4J_PASSWORD
  )
);

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get('/api/health', async (req, res) => {
  const session = driver.session({ database: DATABASE });

  try {
    const result = await session.run(`
      CALL {
        MATCH (n)
        RETURN count(n) AS nodes
      }
      CALL {
        MATCH ()-[r]->()
        RETURN count(r) AS relationships
      }
      RETURN nodes, relationships
    `);

    const record = result.records[0];

    res.json({
      status: 'connected',
      database: DATABASE,
      nodes: record.get('nodes').toNumber(),
      relationships: record.get('relationships').toNumber()
    });
  } catch (error) {
    console.error('Neo4j health check failed:', error.message);

    res.status(500).json({
      status: 'error',
      message: 'Could not query the Neo4j database.'
    });
  } finally {
    await session.close();
  }
});

// --------------------------------------------------
// SUSPECTS: READ AND SEARCH
// --------------------------------------------------

app.get('/api/suspects', async (req, res) => {
  const session = driver.session({ database: DATABASE });

  try {
    const search = String(req.query.search || '').trim();

    const result = await session.run(
      `
      MATCH (s:Suspect)
      WHERE $search = ''
         OR toLower(coalesce(s.name, '')) CONTAINS toLower($search)
         OR toLower(coalesce(s.suspect_id, '')) CONTAINS toLower($search)
         OR toLower(coalesce(s.alias, '')) CONTAINS toLower($search)
      RETURN
        s.suspect_id AS suspect_id,
        s.name AS name,
        s.alias AS alias,
        s.status AS status,
        elementId(s) AS element_id
      ORDER BY name
      LIMIT 100
      `,
      { search }
    );

    res.json({
      count: result.records.length,
      suspects: result.records.map(record => ({
        suspect_id: record.get('suspect_id'),
        name: record.get('name'),
        alias: record.get('alias'),
        status: record.get('status'),
        element_id: record.get('element_id')
      }))
    });
  } catch (error) {
    console.error('Suspects query failed:', error.message);

    res.status(500).json({
      error: 'Could not retrieve suspects.'
    });
  } finally {
    await session.close();
  }
});

// --------------------------------------------------
// SUSPECTS: CREATE
// --------------------------------------------------

app.post('/api/suspects', async (req, res) => {
  const { suspect_id, name, alias, status } = req.body;

  if (
    typeof suspect_id !== 'string' ||
    !suspect_id.trim() ||
    typeof name !== 'string' ||
    !name.trim()
  ) {
    return res.status(400).json({
      error: 'Suspect ID and name are required.'
    });
  }

  const session = driver.session({ database: DATABASE });

  try {
    const result = await session.run(
      `
      CREATE (s:Suspect {
        suspect_id: $suspect_id,
        name: $name,
        alias: $alias,
        status: $status
      })
      RETURN
        s.suspect_id AS suspect_id,
        s.name AS name,
        s.alias AS alias,
        s.status AS status
      `,
      {
        suspect_id: suspect_id.trim(),
        name: name.trim(),
        alias: typeof alias === 'string' ? alias.trim() : '',
        status:
          typeof status === 'string' && status.trim()
            ? status.trim()
            : 'Under Investigation'
      }
    );

    const record = result.records[0];

    res.status(201).json({
      suspect: {
        suspect_id: record.get('suspect_id'),
        name: record.get('name'),
        alias: record.get('alias'),
        status: record.get('status')
      }
    });
  } catch (error) {
    if (
      error.code?.includes('ConstraintValidationFailed') ||
      error.code?.includes('ConstraintVerificationFailed')
    ) {
      return res.status(409).json({
        error: 'That suspect ID already exists.'
      });
    }

    console.error('Create suspect failed:', error.message);

    res.status(500).json({
      error: 'Could not create suspect.'
    });
  } finally {
    await session.close();
  }
});

// --------------------------------------------------
// SUSPECTS: UPDATE
// --------------------------------------------------

app.put('/api/suspects/:id', async (req, res) => {
  const { name, alias, status } = req.body;
  const id = req.params.id;

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      error: 'Suspect name is required.'
    });
  }

  const session = driver.session({ database: DATABASE });

  try {
    const result = await session.run(
      `
      MATCH (s:Suspect {suspect_id: $id})
      SET s.name = $name,
          s.alias = $alias,
          s.status = $status
      RETURN
        s.suspect_id AS suspect_id,
        s.name AS name,
        s.alias AS alias,
        s.status AS status
      `,
      {
        id,
        name: name.trim(),
        alias: typeof alias === 'string' ? alias.trim() : '',
        status:
          typeof status === 'string' && status.trim()
            ? status.trim()
            : 'Under Investigation'
      }
    );

    if (!result.records.length) {
      return res.status(404).json({
        error: 'Suspect not found.'
      });
    }

    const record = result.records[0];

    res.json({
      suspect: {
        suspect_id: record.get('suspect_id'),
        name: record.get('name'),
        alias: record.get('alias'),
        status: record.get('status')
      }
    });
  } catch (error) {
    console.error('Update suspect failed:', error.message);

    res.status(500).json({
      error: 'Could not update suspect.'
    });
  } finally {
    await session.close();
  }
});

// --------------------------------------------------
// SUSPECTS: DELETE
// --------------------------------------------------

app.delete('/api/suspects/:id', async (req, res) => {
  const session = driver.session({ database: DATABASE });

  try {
    const result = await session.run(
      `
      MATCH (s:Suspect {suspect_id: $id})
      DETACH DELETE s
      RETURN $id AS deleted_id
      `,
      { id: req.params.id }
    );

    if (!result.records.length) {
      return res.status(404).json({
        error: 'Suspect not found.'
      });
    }

    res.json({
      message: 'Suspect deleted successfully.',
      suspect_id: result.records[0].get('deleted_id')
    });
  } catch (error) {
    console.error('Delete suspect failed:', error.message);

    res.status(500).json({
      error: 'Could not delete suspect.'
    });
  } finally {
    await session.close();
  }
});

// --------------------------------------------------
// GRAPH EXPLORER
// --------------------------------------------------

app.get('/api/graph', async (req, res) => {
  const session = driver.session({ database: DATABASE });

  try {
    const suspectId = String(req.query.suspectId || 'S001');

    const result = await session.run(
      `
      MATCH (s:Suspect {suspect_id: $suspectId})
      OPTIONAL MATCH (s)-[r]-(other)
      WITH s, r, other
      RETURN
        elementId(s) AS sourceElement,
        s.suspect_id AS suspectId,
        s.name AS suspectName,
        type(r) AS relationship,
        elementId(other) AS targetElement,
        labels(other) AS targetLabels,
        properties(other) AS targetProperties,
        CASE
          WHEN r IS NULL THEN null
          ELSE elementId(startNode(r))
        END AS edgeSource,
        CASE
          WHEN r IS NULL THEN null
          ELSE elementId(endNode(r))
        END AS edgeTarget
      LIMIT 100
      `,
      { suspectId }
    );

    if (!result.records.length) {
      return res.status(404).json({
        error: 'Suspect not found.'
      });
    }

    const nodes = new Map();
    const edges = [];

    function displayName(properties, fallback) {
      return (
        properties.name ||
        properties.title ||
        properties.suspect_id ||
        properties.case_id ||
        properties.evidence_id ||
        properties.org_id ||
        properties.malware_id ||
        properties.ioc_id ||
        properties.officer_id ||
        properties.location_id ||
        fallback
      );
    }

    for (const record of result.records) {
      const sourceId = record.get('sourceElement');
      const suspectName = record.get('suspectName');
      const currentSuspectId = record.get('suspectId');

      nodes.set(sourceId, {
        data: {
          id: sourceId,
          label: String(suspectName || currentSuspectId || sourceId),
          type: 'Suspect',
          suspectId: currentSuspectId,
          properties: {
            suspect_id: currentSuspectId,
            name: suspectName
          }
        }
      });

      const targetId = record.get('targetElement');
      const relationship = record.get('relationship');

      if (!targetId || !relationship) {
        continue;
      }

      const labels = record.get('targetLabels') || [];
      const properties = record.get('targetProperties') || {};

      nodes.set(targetId, {
        data: {
          id: targetId,
          label: String(displayName(properties, targetId)),
          type: labels[0] || 'Entity',
          properties
        }
      });

      const edgeSource = record.get('edgeSource');
      const edgeTarget = record.get('edgeTarget');

      edges.push({
        data: {
          id: `${edgeSource}-${relationship}-${edgeTarget}`,
          source: edgeSource,
          target: edgeTarget,
          label: relationship
        }
      });
    }

    res.json({
      suspectId,
      nodes: Array.from(nodes.values()),
      edges
    });
  } catch (error) {
    console.error('Graph query failed:', error.message);

    res.status(500).json({
      error: 'Could not load graph data.'
    });
  } finally {
    await session.close();
  }
});

// --------------------------------------------------
// INVESTIGATIONS: CASES
// --------------------------------------------------

app.get('/api/cases', async (req, res) => {
  const session = driver.session({ database: DATABASE });

  try {
    const search = String(req.query.search || '').trim();

    const result = await session.run(
      `
      MATCH (c:Case)
      WHERE $search = ''
         OR toLower(coalesce(c.title, '')) CONTAINS toLower($search)
         OR toLower(coalesce(c.case_id, '')) CONTAINS toLower($search)
         OR toLower(coalesce(c.status, '')) CONTAINS toLower($search)
         OR toLower(coalesce(c.severity, '')) CONTAINS toLower($search)
      RETURN
        c.case_id AS case_id,
        c.title AS title,
        c.description AS description,
        c.status AS status,
        c.severity AS severity,
        c.date_opened AS date_opened,
        properties(c) AS properties
      ORDER BY case_id
      LIMIT 200
      `,
      { search }
    );

    const cases = result.records.map(record => ({
      case_id: record.get('case_id'),
      title: record.get('title'),
      description: record.get('description'),
      status: record.get('status'),
      severity: record.get('severity'),
      date_opened: record.get('date_opened'),
      properties: record.get('properties')
    }));

    res.json({
      count: cases.length,
      cases
    });
  } catch (error) {
    console.error('Cases query failed:', error.message);

    res.status(500).json({
      error: 'Could not retrieve investigation cases.'
    });
  } finally {
    await session.close();
  }
});

// --------------------------------------------------
// EVIDENCE
// --------------------------------------------------

app.get('/api/evidence', async (req, res) => {
  const session = driver.session({ database: DATABASE });

  try {
    const search = String(req.query.search || '').trim();

    const result = await session.run(
      `
      MATCH (e:Evidence)
      WHERE $search = ''
         OR toLower(coalesce(e.name, '')) CONTAINS toLower($search)
         OR toLower(coalesce(e.title, '')) CONTAINS toLower($search)
         OR toLower(coalesce(e.evidence_id, '')) CONTAINS toLower($search)
         OR toLower(coalesce(e.type, '')) CONTAINS toLower($search)
         OR toLower(coalesce(e.description, '')) CONTAINS toLower($search)
      RETURN
        e.evidence_id AS evidence_id,
        e.name AS name,
        e.title AS title,
        e.type AS type,
        e.description AS description,
        properties(e) AS properties
      ORDER BY evidence_id
      LIMIT 200
      `,
      { search }
    );

    const evidence = result.records.map(record => ({
      evidence_id: record.get('evidence_id'),
      name: record.get('name'),
      title: record.get('title'),
      type: record.get('type'),
      description: record.get('description'),
      properties: record.get('properties')
    }));

    res.json({
      count: evidence.length,
      evidence
    });
  } catch (error) {
    console.error('Evidence query failed:', error.message);

    res.status(500).json({
      error: 'Could not retrieve evidence records.'
    });
  } finally {
    await session.close();
  }
});

// --------------------------------------------------
// DATA MANAGEMENT: SUMMARY
// --------------------------------------------------

app.get('/api/data-management/summary', async (req, res) => {
  const session = driver.session({ database: DATABASE });

  try {
    const result = await session.run(`
      MATCH (n)
      UNWIND labels(n) AS label
      RETURN label, count(n) AS total
      ORDER BY label
    `);

    const labels = result.records.map(record => ({
      label: record.get('label'),
      count: record.get('total').toNumber()
    }));

    const totals = await session.run(`
      MATCH (n)
      RETURN count(n) AS totalNodes
    `);

    res.json({
      database: DATABASE,
      totalNodes: totals.records[0].get('totalNodes').toNumber(),
      labels
    });
  } catch (error) {
    console.error('Data management summary failed:', error.message);

    res.status(500).json({
      error: 'Could not retrieve database summary.'
    });
  } finally {
    await session.close();
  }
});

// --------------------------------------------------
// DATA MANAGEMENT: RECORDS BY LABEL
// --------------------------------------------------

app.get('/api/data-management/records', async (req, res) => {
  const allowedLabels = [
    'Case',
    'Evidence',
    'IOC',
    'Location',
    'Malware',
    'Officer',
    'Organization',
    'Suspect'
  ];

  const label = String(req.query.label || '');

  if (!allowedLabels.includes(label)) {
    return res.status(400).json({
      error: 'Invalid node label.'
    });
  }

  const session = driver.session({ database: DATABASE });

  try {
    const result = await session.run(
      `
      MATCH (n)
      WHERE $label IN labels(n)
      RETURN elementId(n) AS elementId, properties(n) AS properties
      ORDER BY elementId
      LIMIT 200
      `,
      { label }
    );

    const records = result.records.map(record => ({
      elementId: record.get('elementId'),
      ...record.get('properties')
    }));

    res.json({
      label,
      count: records.length,
      records
    });
  } catch (error) {
    console.error('Data records query failed:', error.message);

    res.status(500).json({
      error: 'Could not retrieve database records.'
    });
  } finally {
    await session.close();
  }
});

// --------------------------------------------------
// GRAPH ANALYTICS: PAGERANK
// Requires the cybervaultGraph GDS projection.
// --------------------------------------------------

app.get('/api/analytics/pagerank', async (req, res) => {
  const session = driver.session({ database: DATABASE });

  try {
    const graphCheck = await session.run(`
      CALL gds.graph.exists('cybervaultGraph')
      YIELD exists
      RETURN exists
    `);

    if (!graphCheck.records[0]?.get('exists')) {
      return res.status(400).json({
        error:
          'Graph projection cybervaultGraph does not exist. Create the GDS graph projection in Neo4j first.'
      });
    }

    const result = await session.run(`
      CALL gds.pageRank.stream('cybervaultGraph')
      YIELD nodeId, score
      WITH gds.util.asNode(nodeId) AS n, score
      RETURN
        elementId(n) AS id,
        labels(n) AS labels,
        properties(n) AS properties,
        score
      ORDER BY score DESC
      LIMIT 25
    `);

    const rankings = result.records.map(record => {
      const properties = record.get('properties') || {};
      const labels = record.get('labels') || [];

      const name =
        properties.name ||
        properties.title ||
        properties.suspect_id ||
        properties.case_id ||
        properties.evidence_id ||
        properties.malware_id ||
        properties.ioc_id ||
        properties.org_id ||
        properties.officer_id ||
        properties.location_id ||
        record.get('id');

      return {
        id: record.get('id'),
        name: String(name),
        type: labels[0] || 'Entity',
        score: Number(record.get('score'))
      };
    });

    res.json({
      algorithm: 'PageRank',
      description:
        'Entities ranked by their PageRank score in cybervaultGraph.',
      graph: 'cybervaultGraph',
      count: rankings.length,
      rankings
    });
  } catch (error) {
    console.error('PageRank calculation failed:', error.message);

    res.status(500).json({
      error:
        'PageRank calculation failed. Check that GDS is installed and cybervaultGraph exists.'
    });
  } finally {
    await session.close();
  }
});

// --------------------------------------------------
// GRAPH ANALYTICS: SHORTEST PATH
// --------------------------------------------------

app.get('/api/analytics/shortest-path', async (req, res) => {
  const session = driver.session({ database: DATABASE });

  try {
    const source = String(req.query.source || '').trim();
    const target = String(req.query.target || '').trim();

    if (!source || !target) {
      return res.status(400).json({
        error: 'Both source and target entity IDs are required.'
      });
    }

    const result = await session.run(
      `
      MATCH (start), (finish)
      WHERE
        coalesce(
          start.suspect_id,
          start.case_id,
          start.evidence_id,
          start.malware_id,
          start.ioc_id,
          start.org_id,
          start.officer_id,
          start.location_id
        ) = $source
        AND
        coalesce(
          finish.suspect_id,
          finish.case_id,
          finish.evidence_id,
          finish.malware_id,
          finish.ioc_id,
          finish.org_id,
          finish.officer_id,
          finish.location_id
        ) = $target
      MATCH p = shortestPath((start)-[*..10]-(finish))
      RETURN p
      LIMIT 1
      `,
      { source, target }
    );

    if (!result.records.length) {
      return res.json({
        length: null,
        path: [],
        edges: [],
        message: 'No path found between these entities.'
      });
    }

    const path = result.records[0].get('p');

    const nodes = path.segments.length
      ? [path.start, ...path.segments.map(segment => segment.end)]
      : [path.start];

    const formattedPath = nodes.map(node => {
      const properties = node.properties || {};
      const labels = node.labels || [];

      const name =
        properties.name ||
        properties.title ||
        properties.case_id ||
        properties.suspect_id ||
        properties.evidence_id ||
        properties.malware_id ||
        properties.ioc_id ||
        properties.org_id ||
        properties.officer_id ||
        properties.location_id ||
        node.elementId;

      return {
        id: node.elementId,
        name: String(name),
        type: labels[0] || 'Entity'
      };
    });

    res.json({
      length: path.length,
      path: formattedPath,
      edges: path.segments.map(segment => ({
        type: segment.relationship.type
      }))
    });
  } catch (error) {
    console.error('Shortest path endpoint failed:', error.message);

    res.status(500).json({
      error: 'Could not calculate the shortest path.'
    });
  } finally {
    await session.close();
  }
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

const server = app.listen(PORT, () => {
  console.log(`CyberVault API listening on port ${PORT}`);
});

async function shutdown() {
  console.log('\nShutting down CyberVault API...');

  server.close(async () => {
    try {
      await driver.close();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error.message);
      process.exit(1);
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
